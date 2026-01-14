'use client';

import { useState, useEffect } from 'react';
import { useSupportPortal, SupportTicket } from '@/lib/hooks/use-support-portal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, AlertCircle } from 'lucide-react';

interface SupportTicketListProps {
  onSelectTicket: (ticketId: string) => void;
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'default',
  pending: 'secondary',
  resolved: 'outline',
  closed: 'outline',
};

export function SupportTicketList({ onSelectTicket }: SupportTicketListProps) {
  const { listTickets, loading: tokenLoading } = useSupportPortal();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchTickets = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await listTickets({
        status: statusFilter === 'all' ? undefined : statusFilter,
        cursor: reset ? undefined : cursor || undefined,
        limit: 20,
      });

      if (reset) {
        setTickets(response.data);
      } else {
        setTickets((prev) => [...prev, ...response.data]);
      }

      setHasMore(response.pagination.hasMore);
      setCursor(response.pagination.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filter changes
  useEffect(() => {
    if (!tokenLoading) {
      fetchTickets(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenLoading, statusFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTicketNumber = (ticket: SupportTicket) => {
    const prefix = ticket.brand?.ticketPrefix || 'DT';
    return `${prefix}-${ticket.ticketNumber}`;
  };

  if (tokenLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Filter */}
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <Button
            variant="link"
            size="sm"
            onClick={() => fetchTickets(true)}
            className="text-destructive"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && tickets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No tickets yet</p>
          <p className="text-sm">Create a new ticket to get help from our team.</p>
        </div>
      )}

      {/* Ticket list */}
      <div className="space-y-2">
        {tickets.map((ticket) => (
          <button
            key={ticket.id}
            onClick={() => onSelectTicket(ticket.id)}
            className="w-full text-left p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {getTicketNumber(ticket)}
                  </span>
                  <Badge variant={STATUS_VARIANTS[ticket.status] || 'default'}>
                    {ticket.status}
                  </Badge>
                </div>
                <h3 className="font-medium truncate">
                  {ticket.title}
                </h3>
              </div>
              <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                <div>{formatDate(ticket.updatedAt)}</div>
                {ticket.commentCount !== undefined && ticket.commentCount > 0 && (
                  <div className="text-xs">
                    {ticket.commentCount} {ticket.commentCount === 1 ? 'reply' : 'replies'}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && tickets.length > 0 && (
        <div className="text-center py-4">
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="text-center py-4">
          <Button variant="link" onClick={() => fetchTickets(false)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
