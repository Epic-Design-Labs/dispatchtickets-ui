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

export function useTicket(brandId: string, ticketId: string) {
  return useQuery({
    queryKey: ticketKeys.detail(brandId, ticketId),
    queryFn: () => ticketsApi.get(brandId, ticketId),
    enabled: !!brandId && !!ticketId,
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
