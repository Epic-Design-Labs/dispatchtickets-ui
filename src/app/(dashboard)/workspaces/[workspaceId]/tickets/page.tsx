'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useBrand, useTickets } from '@/lib/hooks';
import { Header } from '@/components/layout';
import { TicketFilters, TicketTable, CreateTicketDialog } from '@/components/tickets';
import { Button } from '@/components/ui/button';
import { TicketFilters as TicketFiltersType } from '@/types';

export default function TicketsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [filters, setFilters] = useState<TicketFiltersType>({});

  const { data: brand } = useBrand(workspaceId);
  const { data: ticketsData, isLoading } = useTickets(workspaceId, filters);

  const tickets = ticketsData?.data || [];

  return (
    <div className="flex flex-col">
      <Header title={brand?.name ? `${brand.name} - Tickets` : 'Tickets'} />
      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Tickets</h2>
            <p className="text-muted-foreground">
              View and manage support tickets
            </p>
          </div>
          <CreateTicketDialog workspaceId={workspaceId}>
            <Button>
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

        <div className="mb-4">
          <TicketFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        <TicketTable
          tickets={tickets}
          workspaceId={workspaceId}
          isLoading={isLoading}
        />

        {ticketsData?.pagination?.hasMore && (
          <div className="mt-4 flex justify-end">
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
