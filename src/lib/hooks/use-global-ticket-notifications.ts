'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, commentsApi, brandsApi } from '@/lib/api';
import { Ticket } from '@/types';
import { toast } from 'sonner';

const POLL_INTERVAL = 120000; // 2 minutes

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
    tag: `dispatch-${Date.now()}`,
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
  brandId: string;
  status: string | null;
  commentCount: number;
  updatedAt: string;
}

/**
 * Global ticket notification hook that polls ALL brands the user has access to.
 * Should be called once at the dashboard layout level.
 */
export function useGlobalTicketNotifications() {
  const queryClient = useQueryClient();
  const previousTicketsRef = useRef<Map<string, TicketSnapshot>>(new Map());
  const isFirstLoadRef = useRef(true);

  // First, get all brands the user has access to
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Poll tickets across all brands
  const { data: allTicketsData } = useQuery({
    queryKey: ['tickets-notifications-global', brands?.map(b => b.id).join(',')],
    queryFn: async () => {
      if (!brands || brands.length === 0) return { tickets: [], brandMap: {} };

      // Fetch recent tickets from each brand (limit 20 per brand to avoid too many)
      const results = await Promise.all(
        brands.map(async (brand) => {
          try {
            const response = await ticketsApi.list(brand.id, { limit: 20 });
            return { brandId: brand.id, brandName: brand.name, tickets: response.data };
          } catch {
            return { brandId: brand.id, brandName: brand.name, tickets: [] };
          }
        })
      );

      // Flatten all tickets and create a brand name map
      const tickets: Ticket[] = [];
      const brandMap: Record<string, string> = {};

      for (const result of results) {
        brandMap[result.brandId] = result.brandName;
        tickets.push(...result.tickets);
      }

      return { tickets, brandMap };
    },
    enabled: !!brands && brands.length > 0,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });

  const checkForUpdates = useCallback(async (
    tickets: Ticket[],
    brandMap: Record<string, string>
  ) => {
    // Skip first load - just populate the cache
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      const snapshot = new Map<string, TicketSnapshot>();
      tickets.forEach((ticket) => {
        snapshot.set(ticket.id, {
          id: ticket.id,
          brandId: ticket.brandId,
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
        brandId: ticket.brandId,
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
      const brandName = brandMap[ticket.brandId] || '';
      const ticketLabel = ticket.ticketNumber ? `#${ticket.ticketNumber}` : ticket.id.slice(0, 8);
      const prefix = brandName ? `[${brandName}] ` : '';

      switch (type) {
        case 'new':
          toast.info(`${prefix}New ticket: ${ticketLabel}`, {
            description: ticket.title,
            duration: 8000,
            action: {
              label: 'View',
              onClick: () => navigateToTicket(ticket),
            },
          });
          sendDesktopNotification(
            `${prefix}New ticket: ${ticketLabel}`,
            ticket.title,
            () => navigateToTicket(ticket)
          );
          break;

        case 'comment':
          // Fetch latest comment to check if it's from a customer
          try {
            const comments = await commentsApi.list(ticket.brandId, ticket.id);
            if (comments.length > 0) {
              const latestComment = comments[comments.length - 1];
              // Only notify for customer comments
              if (latestComment.authorType === 'CUSTOMER') {
                const authorName = (latestComment.metadata as { authorName?: string })?.authorName || 'Customer';
                const notifTitle = `${prefix}${ticketLabel} reply from ${authorName}`;
                toast.info(notifTitle, {
                  description: ticket.title,
                  duration: 8000,
                  action: {
                    label: 'View',
                    onClick: () => navigateToTicket(ticket),
                  },
                });
                sendDesktopNotification(
                  notifTitle,
                  ticket.title,
                  () => navigateToTicket(ticket)
                );
              }
            }
          } catch {
            // Ignore errors fetching comments
          }
          break;

        case 'status':
          toast.info(`${prefix}${ticketLabel} status changed`, {
            description: `${oldStatus} → ${ticket.status}`,
            duration: 8000,
            action: {
              label: 'View',
              onClick: () => navigateToTicket(ticket),
            },
          });
          break;
      }
    }

    // Invalidate relevant queries
    if (notifications.length > 0) {
      // Invalidate all tickets queries to refresh any open lists
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    }
  }, [queryClient]);

  useEffect(() => {
    if (allTicketsData?.tickets) {
      checkForUpdates(allTicketsData.tickets, allTicketsData.brandMap);
    }
  }, [allTicketsData, checkForUpdates]);
}
