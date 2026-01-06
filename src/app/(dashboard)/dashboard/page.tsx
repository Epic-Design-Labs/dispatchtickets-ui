'use client';

import { useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDashboardTickets, useDashboardStats, useBrands } from '@/lib/hooks';
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
import {
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

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
          assigneeId: session?.customerId,
          status: status || undefined, // Show all non-closed statuses
        };
      case 'unassigned':
        // Show tickets with no assignee
        return {
          ...baseFilters,
          assigneeId: 'null', // Special value to filter for null assignee
          status: status || 'open',
        };
      case 'all':
      default:
        // Show all open tickets (unless status filter is set)
        return {
          ...baseFilters,
          status: status || 'open',
        };
    }
  }, [status, priority, search, selectedBrands, view, session?.customerId]);

  const { data: ticketsData, isLoading: ticketsLoading } = useDashboardTickets(apiFilters);
  const { data: stats, isLoading: statsLoading } = useDashboardStats(selectedBrands);

  const tickets = ticketsData?.data || [];

  return (
    <div className="h-full overflow-auto p-6">
      {/* Filters */}
      <div className="mb-6">
        <TicketFilters
          filters={currentFilters}
          onFiltersChange={handleFiltersChange}
          brands={brands}
          selectedBrandIds={selectedBrands}
          onBrandFilterChange={handleBrandFilterChange}
          showBrandFilter
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
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
