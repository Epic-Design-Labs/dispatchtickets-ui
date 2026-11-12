import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi, type ConvertChatInput } from '@/lib/api/chat';
import { ticketsApi, dashboardApi } from '@/lib/api';
import { dashboardKeys } from '@/lib/hooks/use-dashboard';
import { ticketKeys } from '@/lib/hooks/use-tickets';
import { commentKeys } from '@/lib/hooks/use-comments';
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
  // Turned into tickets: they live in the ticket list now.
  chatConverted: false,
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

/**
 * The same queue across every brand, for the global Chat page and the
 * sidebar's waiting count.
 *
 * Scoping is the API's job, not ours: GET /tickets runs the requested brands
 * through `memberBrandScope`, so a member with access to two of twenty brands
 * gets chats from those two. There is no brandIds filter here on purpose --
 * sending one could only ever NARROW what they are already allowed to see,
 * and leaving it off means the page keeps working when their access changes.
 */
export function useGlobalChatQueue(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.tickets(CHAT_QUEUE_FILTERS),
    queryFn: () => dashboardApi.listTickets(CHAT_QUEUE_FILTERS),
    enabled,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

/** Turn a chat into an email ticket. Refreshes the ticket, its lists and the visitor panel. */
export function useConvertChat(brandId: string, ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ConvertChatInput) => chatApi.convert(brandId, ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(brandId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.visitor(brandId, ticketId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.all(brandId, ticketId) });
    },
  });
}

export function useResendChatConfirmation(brandId: string, ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => chatApi.resendConfirmation(brandId, ticketId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.visitor(brandId, ticketId) }),
  });
}
