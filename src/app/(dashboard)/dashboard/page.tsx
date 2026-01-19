'use client';

import { useMemo, useCallback, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardTickets, useDashboardStats, useBrands, useTeamMembers } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { DashboardTicketFilters, TicketFilters as TicketFiltersType } from '@/types';
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
import { TicketFilters } from '@/components/tickets/ticket-filters';
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog';
import { StatusBadge } from '@/components/tickets/status-badge';
import { PriorityBadge } from '@/components/tickets/priority-badge';
import { toast } from 'sonner';
import {
  Plus,
  RefreshCw,
  MessageSquare,
  Timer,
  Settings2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

type ViewType = 'all' | 'mine' | 'unassigned';

// Column definitions for global dashboard (matching brand view + brand column)
const DASHBOARD_COLUMNS = [
  { key: 'brand', label: 'Brand', defaultVisible: true },
  { key: 'subject', label: 'Subject', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'priority', label: 'Priority', defaultVisible: true },
  { key: 'customer', label: 'Customer', defaultVisible: true },
  { key: 'company', label: 'Company', defaultVisible: false },
  { key: 'assignee', label: 'Assignee', defaultVisible: false },
  { key: 'category', label: 'Category', defaultVisible: false },
  { key: 'created', label: 'Created', defaultVisible: true },
  { key: 'updated', label: 'Updated', defaultVisible: false },
] as const;

const DASHBOARD_COLUMNS_STORAGE_KEY = 'dispatch-dashboard-columns';

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


export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: brands } = useBrands();
  const { data: teamMembersData } = useTeamMembers();
  const teamMembers = teamMembersData?.members;

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') {
      return Object.fromEntries(DASHBOARD_COLUMNS.map(c => [c.key, c.defaultVisible]));
    }
    try {
      const saved = localStorage.getItem(DASHBOARD_COLUMNS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return Object.fromEntries(DASHBOARD_COLUMNS.map(c => [c.key, c.defaultVisible]));
  });

  const toggleColumn = (key: string) => {
    const newVisible = { ...visibleColumns, [key]: !visibleColumns[key] };
    setVisibleColumns(newVisible);
    try {
      localStorage.setItem(DASHBOARD_COLUMNS_STORAGE_KEY, JSON.stringify(newVisible));
    } catch {}
  };

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
  // For "all" view, use global stats; for "mine"/"unassigned", we need to fetch ALL tickets for that view
  // to get accurate counts (not just the first page)
  const allTicketsFilters: DashboardTicketFilters = useMemo(() => {
    if (view === 'all') return { brandIds: selectedBrands.length > 0 ? selectedBrands : undefined };
    // For mine/unassigned, fetch all statuses to calculate stats
    return {
      brandIds: selectedBrands.length > 0 ? selectedBrands : undefined,
      assigneeId: view === 'mine' ? session?.memberId : (view === 'unassigned' ? 'null' : undefined),
      limit: 200, // Get more tickets for stats calculation
    };
  }, [view, selectedBrands, session?.memberId]);

  const { data: allTicketsData, isLoading: allTicketsLoading } = useDashboardTickets(
    view !== 'all' ? allTicketsFilters : { limit: 0 } // Skip if "all" view
  );
  const { data: globalStats, isLoading: globalStatsLoading } = useDashboardStats({
    brandIds: selectedBrands.length > 0 ? selectedBrands : undefined,
  });

  // Calculate stats - use global for "all" view, compute from tickets for "mine"/"unassigned"
  const displayStats = useMemo(() => {
    if (view === 'all') {
      return {
        open: globalStats?.open || 0,
        pending: globalStats?.pending || 0,
        resolved: globalStats?.resolved || 0,
        closed: globalStats?.closed || 0,
      };
    }
    // Calculate from loaded tickets
    const tickets = allTicketsData?.data || [];
    return {
      open: tickets.filter(t => t.status === 'open').length,
      pending: tickets.filter(t => t.status === 'pending').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    };
  }, [view, globalStats, allTicketsData?.data]);

  const stats = displayStats;
  const statsLoading = view === 'all' ? globalStatsLoading : allTicketsLoading;
  const statsTotal = stats.open + stats.pending + stats.resolved + stats.closed;
  const statsActive = stats.open + stats.pending;

  // Handle clicking on a stat card to filter
  const handleStatClick = (newStatus: string | undefined) => {
    if (newStatus === status) {
      // If already filtered by this status, clear it
      updateUrlParams({ status: undefined });
    } else {
      updateUrlParams({ status: newStatus });
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Refreshed');
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

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
      {/* Stats Pills - Matching brand view style */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === 'active' || (!status && !priority && !search)
              ? 'bg-violet-500 text-white'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick('active')}
        >
          <span className={`h-2 w-2 rounded-full ${status === 'active' || (!status && !priority && !search) ? 'bg-blue-300' : 'bg-blue-500'}`} />
          <span>Active</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : statsActive}</span>
        </button>

        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === undefined && (priority || search)
              ? 'bg-white border-2 border-blue-500'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick(undefined)}
        >
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span>All</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : statsTotal}</span>
        </button>

        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === 'open'
              ? 'bg-blue-50 border-2 border-blue-400 text-blue-700'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick('open')}
        >
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span>Open</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : stats.open}</span>
        </button>

        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === 'pending'
              ? 'bg-amber-50 border-2 border-amber-400 text-amber-700'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick('pending')}
        >
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Pending</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : stats.pending}</span>
        </button>

        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === 'resolved'
              ? 'bg-green-50 border-2 border-green-400 text-green-700'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick('resolved')}
        >
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>Resolved</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : stats.resolved}</span>
        </button>

        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === 'closed'
              ? 'bg-green-50 border-2 border-green-400 text-green-700'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick('closed')}
        >
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>Closed</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : stats.closed}</span>
        </button>

        {/* Metrics pills */}
        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-white border border-gray-200">
          <MessageSquare className="h-4 w-4 text-purple-500" />
          <span className="font-bold text-lg">{statsLoading ? '...' : formatDuration(globalStats?.responseMetrics?.avgFirstResponseMinutes)}</span>
          <span className="text-muted-foreground">Avg Response</span>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-white border border-gray-200">
          <Timer className="h-4 w-4 text-indigo-500" />
          <span className="font-bold text-lg">{statsLoading ? '...' : formatDuration(globalStats?.responseMetrics?.avgResolutionMinutes)}</span>
          <span className="text-muted-foreground">Avg Resolution</span>
        </div>
      </div>

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <CreateTicketDialog>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </CreateTicketDialog>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          <TicketFilters
            filters={currentFilters}
            onFiltersChange={handleFiltersChange}
            brands={brands}
            selectedBrandIds={selectedBrands}
            onBrandFilterChange={handleBrandFilterChange}
            showBrandFilter
            teamMembers={teamMembers}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="mr-2 h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DASHBOARD_COLUMNS.map(col => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visibleColumns[col.key] !== false}
                onCheckedChange={() => toggleColumn(col.key)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tickets Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.brand !== false && <TableHead className="w-[100px]">Brand</TableHead>}
              {visibleColumns.subject !== false && <TableHead>Subject</TableHead>}
              {visibleColumns.status !== false && <TableHead className="w-[100px]">Status</TableHead>}
              {visibleColumns.priority !== false && <TableHead className="w-[100px]">Priority</TableHead>}
              {visibleColumns.customer !== false && <TableHead className="w-[150px]">Customer</TableHead>}
              {visibleColumns.company !== false && <TableHead className="w-[150px]">Company</TableHead>}
              {visibleColumns.assignee !== false && <TableHead className="w-[140px]">Assignee</TableHead>}
              {visibleColumns.category !== false && <TableHead className="w-[120px]">Category</TableHead>}
              {visibleColumns.created !== false && <TableHead className="w-[120px]">Created</TableHead>}
              {visibleColumns.updated !== false && <TableHead className="w-[120px]">Updated</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketsLoading ? (
              <TableRow>
                <TableCell colSpan={Object.values(visibleColumns).filter(v => v !== false).length || 7} className="text-center py-8">
                  <div className="text-muted-foreground">Loading tickets...</div>
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Object.values(visibleColumns).filter(v => v !== false).length || 7} className="text-center py-8">
                  <div className="text-muted-foreground">No tickets found</div>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const assignee = ticket.assigneeId
                  ? teamMembers?.find((m) => m.id === ticket.assigneeId)
                  : null;
                return (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(`/brands/${ticket.brandId}/tickets/${ticket.id}`)
                  }
                >
                  {visibleColumns.brand !== false && (
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
                  )}
                  {visibleColumns.subject !== false && (
                    <TableCell>
                      <div className="font-medium truncate max-w-[400px]">
                        {ticket.title}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.status !== false && (
                    <TableCell>
                      {ticket.status && (
                        <StatusBadge status={ticket.status} statusRef={ticket.statusRef} />
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.priority !== false && (
                    <TableCell>
                      {ticket.priority ? (
                        <PriorityBadge priority={ticket.priority as 'low' | 'normal' | 'medium' | 'high' | 'urgent'} />
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.customer !== false && (
                    <TableCell>
                      <div className="text-sm truncate">
                        {ticket.customer?.name || ticket.customer?.email || '-'}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.company !== false && (
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate">
                        {ticket.customer?.company?.name || '-'}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.assignee !== false && (
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate">
                        {assignee
                          ? `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || assignee.email
                          : '-'}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.category !== false && (
                    <TableCell>
                      {ticket.category ? (
                        <Badge variant="outline" className="text-xs">
                          <span
                            className="w-2 h-2 rounded-full mr-1.5"
                            style={{ backgroundColor: ticket.category.color || '#6366f1' }}
                          />
                          {ticket.category.name}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.created !== false && (
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(ticket.createdAt)}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.updated !== false && (
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(ticket.updatedAt)}
                      </span>
                    </TableCell>
                  )}
                </TableRow>
                );
              })
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
