'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statusesApi } from '@/lib/api/statuses';
import { CreateStatusInput, UpdateStatusInput } from '@/types/status';

export const statusKeys = {
  all: (brandId: string) => ['statuses', brandId] as const,
  list: (brandId: string) => ['statuses', brandId, 'list'] as const,
  stats: (brandId: string) => ['statuses', brandId, 'stats'] as const,
  detail: (brandId: string, statusId: string) =>
    ['statuses', brandId, statusId] as const,
};

export function useStatuses(brandId: string) {
  return useQuery({
    queryKey: statusKeys.list(brandId),
    queryFn: () => statusesApi.list(brandId),
    enabled: !!brandId,
  });
}

export function useStatusStats(brandId: string) {
  return useQuery({
    queryKey: statusKeys.stats(brandId),
    queryFn: () => statusesApi.getStats(brandId),
    enabled: !!brandId,
  });
}

export function useStatus(brandId: string, statusId: string) {
  return useQuery({
    queryKey: statusKeys.detail(brandId, statusId),
    queryFn: () => statusesApi.get(brandId, statusId),
    enabled: !!brandId && !!statusId,
  });
}

export function useCreateStatus(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStatusInput) =>
      statusesApi.create(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statusKeys.all(brandId) });
    },
  });
}

export function useUpdateStatus(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ statusId, data }: { statusId: string; data: UpdateStatusInput }) =>
      statusesApi.update(brandId, statusId, data),
    onSuccess: (_, { statusId }) => {
      queryClient.invalidateQueries({ queryKey: statusKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: statusKeys.detail(brandId, statusId),
      });
      // Also invalidate ticket queries since tickets display status data
      queryClient.invalidateQueries({ queryKey: ['tickets', brandId] });
    },
  });
}

export function useDeleteStatus(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (statusId: string) =>
      statusesApi.delete(brandId, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statusKeys.all(brandId) });
      // Also invalidate ticket queries since tickets may reference deleted status
      queryClient.invalidateQueries({ queryKey: ['tickets', brandId] });
    },
  });
}

export function useReorderStatuses(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (statusIds: string[]) =>
      statusesApi.reorder(brandId, statusIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statusKeys.all(brandId) });
    },
  });
}
