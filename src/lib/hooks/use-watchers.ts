'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchersApi } from '@/lib/api/watchers';
import type {
  TicketWatcher,
  AddWatcherInput,
  UpdateWatcherPreferencesInput,
} from '@/types/watcher';

export const watcherKeys = {
  all: (brandId: string, ticketId: string) =>
    ['watchers', brandId, ticketId] as const,
  list: (brandId: string, ticketId: string) =>
    ['watchers', brandId, ticketId, 'list'] as const,
};

export function useWatchers(brandId: string, ticketId: string) {
  return useQuery({
    queryKey: watcherKeys.list(brandId, ticketId),
    queryFn: () => watchersApi.list(brandId, ticketId),
    enabled: !!brandId && !!ticketId,
  });
}

export function useAddWatcher(brandId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddWatcherInput) =>
      watchersApi.add(brandId, ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: watcherKeys.all(brandId, ticketId),
      });
    },
  });
}

export function useRemoveWatcher(brandId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      watchersApi.remove(brandId, ticketId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: watcherKeys.all(brandId, ticketId),
      });
    },
  });
}

export function useUpdateWatcherPreferences(brandId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      data,
    }: {
      memberId: string;
      data: UpdateWatcherPreferencesInput;
    }) => watchersApi.updatePreferences(brandId, ticketId, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: watcherKeys.all(brandId, ticketId),
      });
    },
  });
}
