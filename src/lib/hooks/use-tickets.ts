'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@/lib/api';
import { CreateTicketInput, UpdateTicketInput, TicketFilters } from '@/types';

export const ticketKeys = {
  all: (brandId: string) => ['tickets', brandId] as const,
  list: (brandId: string, filters?: TicketFilters) =>
    ['tickets', brandId, 'list', filters] as const,
  detail: (brandId: string, ticketId: string) =>
    ['tickets', brandId, ticketId] as const,
};

export function useTickets(brandId: string, filters?: TicketFilters) {
  return useQuery({
    queryKey: ticketKeys.list(brandId, filters),
    queryFn: () => ticketsApi.list(brandId, filters),
    enabled: !!brandId,
  });
}

export function useTicket(brandId: string, ticketId: string, options?: { polling?: boolean }) {
  return useQuery({
    queryKey: ticketKeys.detail(brandId, ticketId),
    queryFn: () => ticketsApi.get(brandId, ticketId),
    enabled: !!brandId && !!ticketId,
    // Poll every 10 seconds when viewing a ticket to catch status changes from other users
    refetchInterval: options?.polling ? 10000 : false,
    refetchIntervalInBackground: false, // Don't poll when tab is not focused
  });
}

export function useCreateTicket(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTicketInput) =>
      ticketsApi.create(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(brandId) });
    },
  });
}

// Dynamic version that accepts brandId in the mutation call
export function useCreateTicketDynamic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, data }: { brandId: string; data: CreateTicketInput }) =>
      ticketsApi.create(brandId, data),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(brandId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tickets'] });
    },
  });
}

export function useUpdateTicket(brandId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTicketInput) =>
      ticketsApi.update(brandId, ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: ticketKeys.detail(brandId, ticketId),
      });
    },
  });
}

export function useDeleteTicket(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) =>
      ticketsApi.delete(brandId, ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(brandId) });
    },
  });
}

export function useMarkAsSpam(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, isSpam }: { ticketId: string; isSpam: boolean }) =>
      ticketsApi.markAsSpam(brandId, ticketId, isSpam),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: ticketKeys.detail(brandId, ticketId),
      });
    },
  });
}

export function useCustomerTickets(
  brandId: string,
  customerId: string | undefined,
  excludeTicketId?: string
) {
  return useQuery({
    queryKey: ['customer-tickets', brandId, customerId, excludeTicketId],
    queryFn: async () => {
      if (!customerId) return { data: [], pagination: { hasMore: false } };
      const result = await ticketsApi.list(brandId, {
        customerId,
        limit: 10,
      });
      // Filter out the current ticket if excludeTicketId is provided
      if (excludeTicketId) {
        result.data = result.data.filter((t) => t.id !== excludeTicketId);
      }
      return result;
    },
    enabled: !!brandId && !!customerId,
  });
}

export function useMergeTickets(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetTicketId,
      sourceTicketIds,
    }: {
      targetTicketId: string;
      sourceTicketIds: string[];
    }) => ticketsApi.merge(brandId, targetTicketId, sourceTicketIds),
    onSuccess: () => {
      // Invalidate all ticket queries since multiple tickets are affected
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(brandId) });
      queryClient.invalidateQueries({ queryKey: ['customer-tickets', brandId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tickets'] });
    },
  });
}

export type BulkActionType = 'spam' | 'resolve' | 'close' | 'delete' | 'assign' | 'setCategory' | 'setTags';

export interface BulkActionParams {
  action: BulkActionType;
  ticketIds: string[];
  assigneeId?: string | null;
  categoryId?: string | null;
  tags?: string[];
}

export function useBulkAction(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, ticketIds, assigneeId, categoryId, tags }: BulkActionParams) =>
      ticketsApi.bulkAction(brandId, action, ticketIds, { assigneeId, categoryId, tags }),
    onSuccess: () => {
      // Invalidate all ticket queries since multiple tickets are affected
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(brandId) });
      queryClient.invalidateQueries({ queryKey: ['customer-tickets', brandId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tickets'] });
    },
  });
}
