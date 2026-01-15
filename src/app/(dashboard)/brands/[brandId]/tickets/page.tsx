'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useBrand, useTickets, useTicketNotifications, useEmailConnections, useSyncEmail, useBulkAction, useMergeTickets, useCategories, useTags, useTeamMembers, useFieldsByEntity, useDashboardStats, BulkActionType, ticketKeys } from '@/lib/hooks';
import { toast } from 'sonner';
import { RefreshCw, MessageSquare, Timer } from 'lucide-react';
import { Header } from '@/components/layout';
import { TicketFilters, TicketTable, CreateTicketDialog } from '@/components/tickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TicketFilters as TicketFiltersType } from '@/types';

function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '-';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

export default function BrandDashboardPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  // Default to 'active' status (shows open + pending)
  const [filters, setFilters] = useState<TicketFiltersType>({ status: 'active' });

  const { data: brand, isLoading: brandLoading } = useBrand(brandId);
  // Fetch all tickets for stats (without filters)
  const { data: allTicketsData, isLoading: allTicketsLoading } = useTickets(brandId, {});
  // Fetch filtered tickets for display
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets(brandId, filters);

  // Enable real-time notifications for ticket updates
  useTicketNotifications(brandId);

  // Email sync and refresh
  const queryClient = useQueryClient();
  const { data: emailConnections } = useEmailConnections(brandId);
  const syncEmail = useSyncEmail();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasActiveEmailConnection = emailConnections?.some(c => c.status === 'ACTIVE');

  // Categories, tags, and custom fields
  const { data: categories } = useCategories(brandId);
  const { data: tags } = useTags(brandId);
  const { data: ticketFields } = useFieldsByEntity(brandId, 'ticket');

  // Team members for assignee selection - filtered to only those with access to this brand
  const { data: teamMembersData } = useTeamMembers({ brandId });
  const teamMembers = teamMembersData?.members;

  // Brand-specific stats with response metrics
  const { data: brandStats, isLoading: statsLoading } = useDashboardStats({ brandIds: [brandId] });

  // Bulk actions
  const bulkAction = useBulkAction(brandId);
  const mergeTickets = useMergeTickets(brandId);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (hasActiveEmailConnection) {
        // Sync Gmail and refresh
        const result = await syncEmail.mutateAsync({ brandId });
        if (result.ticketsCreated > 0) {
          toast.success(`Synced ${result.ticketsCreated} new ticket(s)`);
        } else {
          toast.success('No new emails');
        }
      } else {
        // Just refresh the ticket list
        await queryClient.invalidateQueries({ queryKey: ticketKeys.all(brandId) });
        toast.success('Refreshed');
      }
    } catch {
      toast.error(hasActiveEmailConnection ? 'Failed to sync emails' : 'Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBulkAction = async (
    action: BulkActionType,
    ticketIds: string[],
    options?: { assigneeId?: string | null; categoryId?: string | null; tags?: string[]; closeReason?: string }
  ) => {
    try {
      const result = await bulkAction.mutateAsync({ action, ticketIds, ...options });
      const actionLabels: Record<BulkActionType, string> = {
        spam: 'marked as spam',
        resolve: 'resolved',
        close: 'closed',
        delete: 'deleted',
        assign: options?.assigneeId ? 'assigned' : 'unassigned',
        setCategory: options?.categoryId ? 'categorized' : 'uncategorized',
        setTags: 'tagged',
      };
      if (result.success > 0) {
        toast.success(`${result.success} ticket(s) ${actionLabels[action]}`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} ticket(s) failed`);
      }
    } catch {
      toast.error('Bulk action failed');
    }
  };

  const handleMerge = async (targetTicketId: string, sourceTicketIds: string[]) => {
    try {
      const result = await mergeTickets.mutateAsync({ targetTicketId, sourceTicketIds });
      toast.success(`${result.mergedCount} ticket(s) merged successfully`);
    } catch {
      toast.error('Failed to merge tickets');
    }
  };

  const isLoading = brandLoading || allTicketsLoading;

  // Calculate ticket stats from all tickets (unfiltered)
  const allTickets = allTicketsData?.data || [];
  const stats = {
    total: allTickets.length,
    active: allTickets.filter((t) => t.status === 'open' || t.status === 'pending').length,
    open: allTickets.filter((t) => t.status === 'open').length,
    pending: allTickets.filter((t) => t.status === 'pending').length,
    resolved: allTickets.filter((t) => t.status === 'resolved').length,
    closed: allTickets.filter((t) => t.status === 'closed').length,
  };

  // Sort tickets: open first (by newest), then pending (by newest) when showing active
  const tickets = useMemo(() => {
    const rawTickets = ticketsData?.data || [];
    // Only apply grouping when showing "active"
    if (filters.status === 'active') {
      const openTickets = rawTickets
        .filter(t => t.status === 'open')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const pendingTickets = rawTickets
        .filter(t => t.status === 'pending')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return [...openTickets, ...pendingTickets];
    }
    return rawTickets;
  }, [ticketsData?.data, filters.status]);

  // Handle clicking on a stat card to filter
  const handleStatClick = (status: string | undefined) => {
    if (status === filters.status) {
      // If already filtered by this status, clear it
      setFilters((f) => ({ ...f, status: undefined }));
    } else {
      setFilters((f) => ({ ...f, status }));
    }
  };

  return (
    <div className="flex flex-col">
      <Header title={brand?.name || 'Dashboard'} />
      <div className="flex-1 p-6">
        {/* Stats Cards */}
        {isLoading ? (
          <div className="mb-6 flex flex-wrap gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-12 w-32 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                filters.status === 'active'
                  ? 'bg-violet-500 text-white'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleStatClick('active')}
            >
              <span className={`h-2 w-2 rounded-full ${filters.status === 'active' ? 'bg-blue-300' : 'bg-blue-500'}`} />
              <span>Active</span>
              <span className="font-bold text-lg ml-2">{stats.active}</span>
            </button>

            <button
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                !filters.status
                  ? 'bg-white border-2 border-blue-500'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleStatClick(undefined)}
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>All</span>
              <span className="font-bold text-lg ml-2">{stats.total}</span>
            </button>

            <button
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                filters.status === 'open'
                  ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-700'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleStatClick('open')}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Open</span>
              <span className="font-bold text-lg ml-2">{stats.open}</span>
            </button>

            <button
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                filters.status === 'pending'
                  ? 'bg-amber-50 border-2 border-amber-400 text-amber-700'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleStatClick('pending')}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Pending</span>
              <span className="font-bold text-lg ml-2">{stats.pending}</span>
            </button>

            <button
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                filters.status === 'resolved'
                  ? 'bg-green-50 border-2 border-green-400 text-green-700'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleStatClick('resolved')}
            >
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span>Resolved</span>
              <span className="font-bold text-lg ml-2">{stats.resolved}</span>
            </button>

            <button
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                filters.status === 'closed'
                  ? 'bg-gray-100 border-2 border-gray-400 text-gray-700'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleStatClick('closed')}
            >
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              <span>Closed</span>
              <span className="font-bold text-lg ml-2">{stats.closed}</span>
            </button>

            {/* Metrics pills */}
            <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-white border border-gray-200">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <span className="font-bold text-lg">{statsLoading ? '...' : formatDuration(brandStats?.responseMetrics?.avgFirstResponseMinutes)}</span>
              <span className="text-muted-foreground">Avg Response</span>
            </div>

            <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-white border border-gray-200">
              <Timer className="h-4 w-4 text-indigo-500" />
              <span className="font-bold text-lg">{statsLoading ? '...' : formatDuration(brandStats?.responseMetrics?.avgResolutionMinutes)}</span>
              <span className="text-muted-foreground">Avg Resolution</span>
            </div>
          </div>
        )}

        {/* Tickets Section */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Tickets
            {filters.status && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (filtered by {filters.status})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || syncEmail.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing || syncEmail.isPending ? 'animate-spin' : ''}`} />
              {isRefreshing || syncEmail.isPending
                ? 'Refreshing...'
                : hasActiveEmailConnection
                ? 'Sync Email'
                : 'Refresh'}
            </Button>
            <CreateTicketDialog brandId={brandId}>
              <Button size="sm">
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Ticket
              </Button>
            </CreateTicketDialog>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <TicketFilters
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            tags={tags}
            teamMembers={teamMembers}
          />
        </div>

        {/* Ticket Table */}
        <TicketTable
          tickets={tickets}
          brandId={brandId}
          isLoading={ticketsLoading}
          onBulkAction={handleBulkAction}
          onMerge={handleMerge}
          teamMembers={teamMembers}
          categories={categories}
          tags={tags}
          customFields={ticketFields}
        />

        {/* Load More */}
        {ticketsData?.pagination?.hasMore && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  cursor: ticketsData.pagination.nextCursor || undefined,
                }))
              }
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
