import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/api/chat';
import { ticketsApi } from '@/lib/api';
import { ticketKeys } from '@/lib/hooks/use-tickets';
import type { TicketFilters } from '@/types';

export const chatKeys = {
  visitor: (brandId: string, ticketId: string) => ['chat', 'visitor', brandId, ticketId] as const,
};

/** Presence for a chat ticket's visitor. Polls while the tab is visible. */
export function useChatVisitor(brandId: string, ticketId: string, enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.visitor(brandId, ticketId),
    queryFn: () => chatApi.visitor(brandId, ticketId),
    enabled: enabled && !!brandId && !!ticketId,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
}

/**
 * Open chats, longest-waiting first. The Chat tab and its nav count share this
 * query key, and the live stream's ticket invalidations keep it fresh; the
 * poll only covers a dropped stream.
 */
export const CHAT_QUEUE_FILTERS: TicketFilters = {
  source: 'chat',
  status: 'active',
  sort: 'awaitingReplySince',
  order: 'asc',
  limit: 100,
};

export function useChatQueue(brandId: string, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.list(brandId, CHAT_QUEUE_FILTERS),
    queryFn: () => ticketsApi.list(brandId, CHAT_QUEUE_FILTERS),
    enabled: enabled && !!brandId,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
