'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recurringTicketsApi } from '@/lib/api';
import {
  CreateRecurringTicketInput,
  UpdateRecurringTicketInput,
  ListRecurringTicketsParams,
} from '@/types';

export const recurringTicketKeys = {
  all: (brandId: string) => ['recurring-tickets', brandId] as const,
  list: (brandId: string, params?: ListRecurringTicketsParams) =>
    ['recurring-tickets', brandId, 'list', params] as const,
  detail: (brandId: string, id: string) =>
    ['recurring-tickets', brandId, id] as const,
};

export function useRecurringTickets(
  brandId: string,
  params?: ListRecurringTicketsParams,
) {
  return useQuery({
    queryKey: recurringTicketKeys.list(brandId, params),
    queryFn: () => recurringTicketsApi.list(brandId, params),
    enabled: !!brandId,
  });
}

export function useRecurringTicket(brandId: string, id: string) {
  return useQuery({
    queryKey: recurringTicketKeys.detail(brandId, id),
    queryFn: () => recurringTicketsApi.getById(brandId, id),
    enabled: !!brandId && !!id,
  });
}

export function useCreateRecurringTicket(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRecurringTicketInput) =>
      recurringTicketsApi.create(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: recurringTicketKeys.all(brandId),
      });
    },
  });
}

export function useUpdateRecurringTicket(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecurringTicketInput }) =>
      recurringTicketsApi.update(brandId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: recurringTicketKeys.all(brandId),
      });
    },
  });
}

export function useDeleteRecurringTicket(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recurringTicketsApi.delete(brandId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: recurringTicketKeys.all(brandId),
      });
    },
  });
}

export function usePauseRecurringTicket(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recurringTicketsApi.pause(brandId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: recurringTicketKeys.all(brandId),
      });
    },
  });
}

export function useResumeRecurringTicket(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recurringTicketsApi.resume(brandId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: recurringTicketKeys.all(brandId),
      });
    },
  });
}

export function useTriggerRecurringTicket(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recurringTicketsApi.triggerManually(brandId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: recurringTicketKeys.all(brandId),
      });
    },
  });
}
