'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { Ticket } from '@/types';

interface TicketTableProps {
  tickets: Ticket[];
  workspaceId: string;
  isLoading?: boolean;
  renderActions?: (ticket: Ticket) => React.ReactNode;
}

export function TicketTable({ tickets, workspaceId, isLoading, renderActions }: TicketTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-14" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border py-12">
        <svg
          className="mb-4 h-12 w-12 text-muted-foreground"
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
        <p className="text-lg font-medium">No tickets found</p>
        <p className="text-muted-foreground">
          Create a ticket or adjust your filters
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Created</TableHead>
            {renderActions && <TableHead className="w-24">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => {
            const customerEmail = ticket.customFields?.requesterEmail as string | undefined;
            const customerName = ticket.customFields?.requesterName as string | undefined;
            return (
              <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link
                    href={`/brands/${workspaceId}/tickets/${ticket.id}`}
                    className="block font-medium hover:underline"
                  >
                    {ticket.title}
                  </Link>
                </TableCell>
                <TableCell>
                  {ticket.status ? <StatusBadge status={ticket.status} /> : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  {ticket.priority ? <PriorityBadge priority={ticket.priority} /> : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customerEmail || customerName || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </TableCell>
                {renderActions && (
                  <TableCell>
                    {renderActions(ticket)}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
