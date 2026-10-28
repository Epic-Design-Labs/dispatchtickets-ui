'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedRepliesApi } from '@/lib/api/saved-replies';
import type { SavedReplyInput } from '@/types';

export const savedReplyKeys = {
  all: (brandId: string) => ['saved-replies', brandId] as const,
};

export function useSavedReplies(brandId: string) {
  return useQuery({
    queryKey: savedReplyKeys.all(brandId),
    queryFn: () => savedRepliesApi.list(brandId),
    enabled: !!brandId,
    staleTime: 60_000,
  });
}

export function useCreateSavedReply(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SavedReplyInput) => savedRepliesApi.create(brandId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: savedReplyKeys.all(brandId) }),
  });
}

export function useUpdateSavedReply(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SavedReplyInput> }) =>
      savedRepliesApi.update(brandId, id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: savedReplyKeys.all(brandId) }),
  });
}

export function useDeleteSavedReply(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savedRepliesApi.delete(brandId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: savedReplyKeys.all(brandId) }),
  });
}
