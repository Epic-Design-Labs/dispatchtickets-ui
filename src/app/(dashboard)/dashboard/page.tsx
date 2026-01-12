'use client';

import { useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDashboardTickets, useDashboardStats, useDashboardTrends, useBrands } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { DashboardTicketFilters, TicketFilters as TicketFiltersType } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketFilters } from '@/components/tickets/ticket-filters';
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog';
import {
  Ticket,
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  MessageSquare,
  Timer,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ViewType = 'all' | 'mine' | 'unassigned';

function formatTimeAgo(date: string) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '-';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function formatChartDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStatusColor(status: string | null) {
  switch (status) {
    case 'open':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'resolved':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'closed':
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    default:
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
}

function getPriorityColor(priority: string | null) {
  switch (priority) {
    case 'urgent':
      return 'text-red-600';
    case 'high':
      return 'text-orange-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-gray-500';
    default:
      return 'text-gray-400';
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { data: brands } = useBrands();

  // Parse URL params
  const view = (searchParams.get('view') || 'all') as ViewType;
  const status = searchParams.get('status') || undefined;
  const priority = searchParams.get('priority') || undefined;
  const search = searchParams.get('search') || undefined;
  const brandsParam = searchParams.get('brands');
  const selectedBrands = brandsParam ? brandsParam.split(',').filter(Boolean) : [];

  // Update URL params helper
  const updateUrlParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const current = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          current.set(key, value);
        } else {
          current.delete(key);
        }
      });
      router.push(`/dashboard?${current.toString()}`);
    },
    [searchParams, router]
  );

  // Handle filter changes from TicketFilters component
  const handleFiltersChange = useCallback(
    (newFilters: TicketFiltersType) => {
      updateUrlParams({
        status: newFilters.status,
        priority: newFilters.priority,
        search: newFilters.search,
      });
    },
    [updateUrlParams]
  );

  // Handle brand filter changes
  const handleBrandFilterChange = useCallback(
    (brandIds: string[]) => {
      updateUrlParams({
        brands: brandIds.length > 0 ? brandIds.join(',') : undefined,
      });
    },
    [updateUrlParams]
  );

  // Current filters for TicketFilters component
  const currentFilters: TicketFiltersType = useMemo(
    () => ({
      status,
      priority,
      search,
    }),
    [status, priority, search]
  );

  // Build filters based on view
  const apiFilters: DashboardTicketFilters = useMemo(() => {
    const baseFilters: DashboardTicketFilters = {
      brandIds: selectedBrands.length > 0 ? selectedBrands : undefined,
      limit: 50,
      priority,
      search,
    };

    switch (view) {
      case 'mine':
        // Show tickets assigned to current user (non-closed)
        return {
          ...baseFilters,
          assigneeId: session?.memberId,
          status: status || undefined, // Show all non-closed statuses
        };
      case 'unassigned':
        // Show tickets with no assignee
        return {
          ...baseFilters,
          assigneeId: 'null', // Special value to filter for null assignee
          status: status || 'active', // Default to active (open+pending)
        };
      case 'all':
      default:
        // Show all active tickets (open + pending) unless status filter is set
        return {
          ...baseFilters,
          status: status || 'active',
        };
    }
  }, [status, priority, search, selectedBrands, view, session?.memberId]);

  const { data: ticketsData, isLoading: ticketsLoading } = useDashboardTickets(apiFilters);
  const { data: stats, isLoading: statsLoading } = useDashboardStats(selectedBrands);
  const { data: trends, isLoading: trendsLoading } = useDashboardTrends({
    brandIds: selectedBrands.length > 0 ? selectedBrands : undefined,
    days: 30,
  });

  // Sort tickets: open first (by newest), then pending (by newest)
  const tickets = useMemo(() => {
    const rawTickets = ticketsData?.data || [];
    // Only apply grouping when showing "active" (default view with no specific status filter)
    if (!status) {
      const openTickets = rawTickets
        .filter(t => t.status === 'open')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const pendingTickets = rawTickets
        .filter(t => t.status === 'pending')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return [...openTickets, ...pendingTickets];
    }
    return rawTickets;
  }, [ticketsData?.data, status]);

  return (
    <div className="h-full overflow-auto p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <Ticket className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.open || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.pending || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.resolved || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.closed || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : formatDuration(stats?.responseMetrics?.avgFirstResponseMinutes)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.responseMetrics?.ticketsWithResponse || 0} tickets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <Timer className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : formatDuration(stats?.responseMetrics?.avgResolutionMinutes)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.responseMetrics?.ticketsResolved || 0} resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Volume (30 days)</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Loading trends...
            </div>
          ) : trends?.data && trends.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={trends.data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length && label) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="text-xs text-muted-foreground mb-1">
                            {formatChartDate(String(label))}
                          </div>
                          <div className="grid gap-1">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              <span>Created: {payload[0]?.value}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <span>Resolved: {payload[1]?.value}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCreated)"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorResolved)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No trend data available
            </div>
          )}
          <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Created</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Resolved</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Section Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Tickets
          {status && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (filtered by {status})
            </span>
          )}
        </h3>
        <CreateTicketDialog>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        </CreateTicketDialog>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <TicketFilters
          filters={currentFilters}
          onFiltersChange={handleFiltersChange}
          brands={brands}
          selectedBrandIds={selectedBrands}
          onBrandFilterChange={handleBrandFilterChange}
          showBrandFilter
        />
      </div>

      {/* Tickets Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Brand</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[180px]">Customer</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[120px]">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketsLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-muted-foreground">Loading tickets...</div>
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-muted-foreground">No tickets found</div>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(`/brands/${ticket.brandId}/tickets/${ticket.id}`)
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {ticket.brand.iconUrl ? (
                        <img
                          src={ticket.brand.iconUrl}
                          alt={ticket.brand.name}
                          className="w-5 h-5 rounded"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                          {ticket.brand.ticketPrefix?.charAt(0) || 'B'}
                        </div>
                      )}
                      <Badge
                        variant="outline"
                        className="font-mono text-xs"
                      >
                        {ticket.brand.ticketPrefix}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium truncate max-w-[400px]">
                      {ticket.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm truncate">
                      {String(
                        (ticket.customFields as Record<string, unknown>)?.requesterName ||
                        (ticket.customFields as Record<string, unknown>)?.requesterEmail ||
                        'Unknown'
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'capitalize text-xs',
                        getStatusColor(ticket.status)
                      )}
                    >
                      {ticket.status || 'open'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'text-sm capitalize',
                        getPriorityColor(ticket.priority)
                      )}
                    >
                      {ticket.priority || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatTimeAgo(ticket.createdAt)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load More */}
      {ticketsData?.pagination?.hasMore && (
        <div className="mt-4 text-center">
          <Button variant="outline" size="sm">
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
