'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useBrand, useTickets, useTicketNotifications } from '@/lib/hooks';
import { Header } from '@/components/layout';
import { TicketFilters, TicketTable, CreateTicketDialog } from '@/components/tickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TicketFilters as TicketFiltersType } from '@/types';

export default function BrandDashboardPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  const [filters, setFilters] = useState<TicketFiltersType>({});

  const { data: brand, isLoading: brandLoading } = useBrand(brandId);
  // Fetch all tickets for stats (without filters)
  const { data: allTicketsData, isLoading: allTicketsLoading } = useTickets(brandId, {});
  // Fetch filtered tickets for display
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets(brandId, filters);

  // Enable real-time notifications for ticket updates
  useTicketNotifications(brandId);

  const isLoading = brandLoading || allTicketsLoading;

  // Calculate ticket stats from all tickets (unfiltered)
  const allTickets = allTicketsData?.data || [];
  const stats = {
    total: allTickets.length,
    open: allTickets.filter((t) => t.status === 'open').length,
    pending: allTickets.filter((t) => t.status === 'pending').length,
    resolved: allTickets.filter((t) => t.status === 'resolved').length,
    closed: allTickets.filter((t) => t.status === 'closed').length,
  };

  const tickets = ticketsData?.data || [];

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
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
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
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card
              className={`cursor-pointer transition-colors hover:bg-accent ${
                !filters.status ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleStatClick(undefined)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
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

        {/* Filters */}
        <div className="mb-4">
          <TicketFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Ticket Table */}
        <TicketTable
          tickets={tickets}
          brandId={brandId}
          isLoading={ticketsLoading}
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
