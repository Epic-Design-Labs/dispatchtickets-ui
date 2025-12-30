'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@/lib/api';
import { CreateTicketInput, UpdateTicketInput, TicketFilters } from '@/types';

export const ticketKeys = {
  all: (workspaceId: string) => ['tickets', workspaceId] as const,
  list: (workspaceId: string, filters?: TicketFilters) =>
    ['tickets', workspaceId, 'list', filters] as const,
  detail: (workspaceId: string, ticketId: string) =>
    ['tickets', workspaceId, ticketId] as const,
};

export function useTickets(workspaceId: string, filters?: TicketFilters) {
  return useQuery({
    queryKey: ticketKeys.list(workspaceId, filters),
    queryFn: () => ticketsApi.list(workspaceId, filters),
    enabled: !!workspaceId,
  });
}

export function useTicket(workspaceId: string, ticketId: string) {
  return useQuery({
    queryKey: ticketKeys.detail(workspaceId, ticketId),
    queryFn: () => ticketsApi.get(workspaceId, ticketId),
    enabled: !!workspaceId && !!ticketId,
  });
}

export function useCreateTicket(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTicketInput) =>
      ticketsApi.create(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(workspaceId) });
    },
  });
}

export function useUpdateTicket(workspaceId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTicketInput) =>
      ticketsApi.update(workspaceId, ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(workspaceId) });
      queryClient.invalidateQueries({
        queryKey: ticketKeys.detail(workspaceId, ticketId),
      });
    },
  });
}

export function useDeleteTicket(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) =>
      ticketsApi.delete(workspaceId, ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(workspaceId) });
    },
  });
}
