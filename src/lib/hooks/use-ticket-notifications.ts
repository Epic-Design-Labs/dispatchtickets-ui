'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, commentsApi } from '@/lib/api';
import { Ticket, Comment } from '@/types';
import { toast } from 'sonner';

const POLL_INTERVAL = 30000; // 30 seconds

// Check if desktop notifications are enabled
function isDesktopNotificationsEnabled(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return (
    Notification.permission === 'granted' &&
    localStorage.getItem('desktop_notifications_enabled') === 'true'
  );
}

// Send a desktop notification
function sendDesktopNotification(
  title: string,
  body: string,
  onClick?: () => void
): void {
  if (!isDesktopNotificationsEnabled()) return;

  const notification = new Notification(title, {
    body,
    icon: '/icon.svg',
    tag: `dispatch-${Date.now()}`, // Unique tag to allow multiple notifications
  });

  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }
}

interface TicketSnapshot {
  id: string;
  status: string | null;
  commentCount: number;
  updatedAt: string;
}

export function useTicketNotifications(brandId: string | undefined) {
  const queryClient = useQueryClient();
  const previousTicketsRef = useRef<Map<string, TicketSnapshot>>(new Map());
  const isFirstLoadRef = useRef(true);

  // Poll tickets
  const { data } = useQuery({
    queryKey: ['tickets-notifications', brandId],
    queryFn: () => ticketsApi.list(brandId!, { limit: 50 }),
    enabled: !!brandId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });

  const checkForUpdates = useCallback(async (tickets: Ticket[]) => {
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

    // Helper to navigate to ticket
    const navigateToTicket = (ticket: Ticket) => {
      window.location.href = `/brands/${ticket.brandId}/tickets/${ticket.id}`;
    };

    // Show notifications
    for (const { type, ticket, oldStatus } of notifications) {
      const ticketLabel = ticket.ticketNumber ? `#${ticket.ticketNumber}` : ticket.id.slice(0, 8);

      switch (type) {
        case 'new':
          toast.info(`New ticket: ${ticketLabel}`, {
            description: ticket.title,
            duration: 8000,
            action: {
              label: 'View',
              onClick: () => navigateToTicket(ticket),
            },
          });
          // Also send desktop notification
          sendDesktopNotification(
            `New ticket: ${ticketLabel}`,
            ticket.title,
            () => navigateToTicket(ticket)
          );
          break;

        case 'comment':
          // Fetch latest comment to check if it's from a customer and get name
          try {
            const comments = await commentsApi.list(ticket.brandId, ticket.id);
            if (comments.length > 0) {
              const latestComment = comments[comments.length - 1];
              // Only notify for customer comments (external), not agent comments (internal)
              if (latestComment.authorType === 'CUSTOMER') {
                const authorName = (latestComment.metadata as { authorName?: string })?.authorName || 'Customer';
                const notifTitle = `${ticketLabel} reply from ${authorName}`;
                toast.info(notifTitle, {
                  description: ticket.title,
                  duration: 8000,
                  action: {
                    label: 'View',
                    onClick: () => navigateToTicket(ticket),
                  },
                });
                // Also send desktop notification
                sendDesktopNotification(
                  notifTitle,
                  ticket.title,
                  () => navigateToTicket(ticket)
                );
              }
            }
          } catch {
            // Fallback if comment fetch fails - still only show for external, but we can't tell
          }
          break;

        case 'status':
          toast.info(`${ticketLabel} status changed`, {
            description: `${oldStatus} → ${ticket.status}`,
            duration: 8000,
            action: {
              label: 'View',
              onClick: () => navigateToTicket(ticket),
            },
          });
          // Status changes don't need desktop notifications (less urgent)
          break;
      }
    }

    // Invalidate tickets query to refresh the list
    if (notifications.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['tickets', brandId] });
    }
  }, [brandId, queryClient]);

  useEffect(() => {
    if (data?.data) {
      checkForUpdates(data.data);
    }
  }, [data, checkForUpdates]);

  // Reset when brand changes
  useEffect(() => {
    isFirstLoadRef.current = true;
    previousTicketsRef.current = new Map();
  }, [brandId]);
}
