'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@/lib/api';
import { Ticket } from '@/types';
import { toast } from 'sonner';

const POLL_INTERVAL = 30000; // 30 seconds

interface TicketSnapshot {
  id: string;
  status: string | null;
  commentCount: number;
  updatedAt: string;
}

export function useTicketNotifications(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const previousTicketsRef = useRef<Map<string, TicketSnapshot>>(new Map());
  const isFirstLoadRef = useRef(true);

  // Poll tickets
  const { data } = useQuery({
    queryKey: ['tickets-notifications', workspaceId],
    queryFn: () => ticketsApi.list(workspaceId!, { limit: 50 }),
    enabled: !!workspaceId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });

  const checkForUpdates = useCallback((tickets: Ticket[]) => {
    // Skip first load - just populate the cache
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      const snapshot = new Map<string, TicketSnapshot>();
      tickets.forEach((ticket) => {
        snapshot.set(ticket.id, {
          id: ticket.id,
          status: ticket.status,
          commentCount: ticket.commentCount || 0,
          updatedAt: ticket.updatedAt,
        });
      });
      previousTicketsRef.current = snapshot;
      return;
    }

    const previous = previousTicketsRef.current;
    const notifications: { type: 'new' | 'comment' | 'status'; ticket: Ticket; oldStatus?: string }[] = [];

    tickets.forEach((ticket) => {
      const prev = previous.get(ticket.id);

      if (!prev) {
        // New ticket
        notifications.push({ type: 'new', ticket });
      } else {
        // Check for new comments
        const currentCommentCount = ticket.commentCount || 0;
        if (currentCommentCount > prev.commentCount) {
          notifications.push({ type: 'comment', ticket });
        }

        // Check for status change
        if (ticket.status !== prev.status && prev.status !== null) {
          notifications.push({ type: 'status', ticket, oldStatus: prev.status || undefined });
        }
      }
    });

    // Update snapshot
    const snapshot = new Map<string, TicketSnapshot>();
    tickets.forEach((ticket) => {
      snapshot.set(ticket.id, {
        id: ticket.id,
        status: ticket.status,
        commentCount: ticket.commentCount || 0,
        updatedAt: ticket.updatedAt,
      });
    });
    previousTicketsRef.current = snapshot;

    // Show notifications
    notifications.forEach(({ type, ticket, oldStatus }) => {
      const ticketLabel = `#${ticket.ticketNumber}`;

      switch (type) {
        case 'new':
          toast.info(`New ticket: ${ticketLabel}`, {
            description: ticket.title,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = `/workspaces/${ticket.workspaceId}/tickets/${ticket.id}`;
              },
            },
          });
          break;

        case 'comment':
          toast.info(`New comment on ${ticketLabel}`, {
            description: ticket.title,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = `/workspaces/${ticket.workspaceId}/tickets/${ticket.id}`;
              },
            },
          });
          break;

        case 'status':
          toast.info(`${ticketLabel} status changed`, {
            description: `${oldStatus} → ${ticket.status}`,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = `/workspaces/${ticket.workspaceId}/tickets/${ticket.id}`;
              },
            },
          });
          break;
      }
    });

    // Invalidate tickets query to refresh the list
    if (notifications.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['tickets', workspaceId] });
    }
  }, [workspaceId, queryClient]);

  useEffect(() => {
    if (data?.data) {
      checkForUpdates(data.data);
    }
  }, [data, checkForUpdates]);

  // Reset when workspace changes
  useEffect(() => {
    isFirstLoadRef.current = true;
    previousTicketsRef.current = new Map();
  }, [workspaceId]);
}
