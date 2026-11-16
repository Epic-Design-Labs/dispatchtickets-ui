'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@/lib/api';
import type { UpdateTicketInput } from '@/types';
import { dashboardKeys } from './use-dashboard';
import { ticketKeys } from './use-tickets';

export interface QueueTicketUpdate {
  brandId: string;
  ticketId: string;
  data: UpdateTicketInput;
}

/**
 * Change one ticket from a list that spans brands.
 *
 * `useUpdateTicket(brandId, ticketId)` is bound to a single ticket, which is
 * right on a ticket page and useless in a queue: every row is a different
 * brand and a different id. This takes both per call and invalidates the
 * cross-brand queues alongside that brand's own lists, so the row leaves the
 * group it was in and the sidebar count follows.
 */
export function useQueueTicketAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, ticketId, data }: QueueTicketUpdate) =>
      ticketsApi.update(brandId, ticketId, data),
    onSuccess: (_result, { brandId, ticketId }) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(brandId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(brandId, ticketId) });
    },
  });
}
