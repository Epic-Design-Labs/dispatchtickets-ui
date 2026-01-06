'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { Ticket } from '@/types';
import { Ban, CheckCircle, Clock, Trash2, X } from 'lucide-react';

interface TicketTableProps {
  tickets: Ticket[];
  brandId: string;
  isLoading?: boolean;
  renderActions?: (ticket: Ticket) => React.ReactNode;
  onBulkAction?: (action: 'spam' | 'resolve' | 'close' | 'delete', ticketIds: string[]) => Promise<void>;
}

export function TicketTable({ tickets, brandId, isLoading, renderActions, onBulkAction }: TicketTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const allSelected = tickets.length > 0 && selectedIds.size === tickets.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < tickets.length;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map(t => t.id)));
    }
  }, [allSelected, tickets]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBulkAction = useCallback(async (action: 'spam' | 'resolve' | 'close' | 'delete') => {
    if (!onBulkAction || selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      await onBulkAction(action, Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setIsProcessing(false);
    }
  }, [onBulkAction, selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
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
                  <Skeleton className="h-4 w-4" />
                </TableCell>
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
    <div className="space-y-2">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
          <span className="text-sm font-medium px-2">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('resolve')}
            disabled={isProcessing}
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            Resolve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('close')}
            disabled={isProcessing}
          >
            <Clock className="mr-1 h-4 w-4" />
            Close
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('spam')}
            disabled={isProcessing}
            className="text-orange-600 hover:text-orange-700"
          >
            <Ban className="mr-1 h-4 w-4" />
            Spam
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('delete')}
            disabled={isProcessing}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
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
              const isSelected = selectedIds.has(ticket.id);
              return (
                <TableRow
                  key={ticket.id}
                  className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(ticket.id)}
                      aria-label={`Select ticket ${ticket.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/brands/${brandId}/tickets/${ticket.id}`}
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
    </div>
  );
}
