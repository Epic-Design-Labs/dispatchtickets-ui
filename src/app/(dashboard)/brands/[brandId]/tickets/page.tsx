'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useBrand, useTickets, useTicketNotifications, useEmailConnections, useSyncEmail, useBulkAction, useCategories, useTags } from '@/lib/hooks';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout';
import { TicketFilters, TicketTable, CreateTicketDialog } from '@/components/tickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TicketFilters as TicketFiltersType } from '@/types';

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

  // Email sync
  const { data: emailConnections } = useEmailConnections(brandId);
  const syncEmail = useSyncEmail();
  const hasActiveEmailConnection = emailConnections?.some(c => c.status === 'ACTIVE');

  // Categories and tags for filtering
  const { data: categories } = useCategories(brandId);
  const { data: tags } = useTags(brandId);

  // Bulk actions
  const bulkAction = useBulkAction(brandId);

  const handleSync = async () => {
    try {
      const result = await syncEmail.mutateAsync({ brandId });
      if (result.ticketsCreated > 0) {
        toast.success(`Synced ${result.ticketsCreated} new ticket(s)`);
      } else {
        toast.success('No new emails');
      }
    } catch {
      toast.error('Failed to sync emails');
    }
  };

  const handleBulkAction = async (
    action: 'spam' | 'resolve' | 'close' | 'delete',
    ticketIds: string[]
  ) => {
    try {
      const result = await bulkAction.mutateAsync({ action, ticketIds });
      const actionLabels = {
        spam: 'marked as spam',
        resolve: 'resolved',
        close: 'closed',
        delete: 'deleted',
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
          <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card
              className={`cursor-pointer transition-colors hover:bg-accent ${
                filters.status === 'active' ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => handleStatClick('active')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <div className="h-2 w-2 rounded-full bg-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors hover:bg-accent ${
                !filters.status ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleStatClick(undefined)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">All</CardTitle>
                <svg
                  className="h-4 w-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors hover:bg-accent ${
                filters.status === 'open' ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleStatClick('open')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open</CardTitle>
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.open}</div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors hover:bg-accent ${
                filters.status === 'pending' ? 'ring-2 ring-yellow-500' : ''
              }`}
              onClick={() => handleStatClick('pending')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors hover:bg-accent ${
                filters.status === 'resolved' ? 'ring-2 ring-green-500' : ''
              }`}
              onClick={() => handleStatClick('resolved')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <div className="h-2 w-2 rounded-full bg-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.resolved}</div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors hover:bg-accent ${
                filters.status === 'closed' ? 'ring-2 ring-gray-500' : ''
              }`}
              onClick={() => handleStatClick('closed')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closed</CardTitle>
                <div className="h-2 w-2 rounded-full bg-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.closed}</div>
              </CardContent>
            </Card>
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
            {hasActiveEmailConnection && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncEmail.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncEmail.isPending ? 'animate-spin' : ''}`} />
                {syncEmail.isPending ? 'Syncing...' : 'Sync Email'}
              </Button>
            )}
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
          />
        </div>

        {/* Ticket Table */}
        <TicketTable
          tickets={tickets}
          brandId={brandId}
          isLoading={ticketsLoading}
          onBulkAction={handleBulkAction}
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
