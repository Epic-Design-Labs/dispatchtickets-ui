import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/api/chat';

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
