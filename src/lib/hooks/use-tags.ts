'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi, Tag, CreateTagInput, UpdateTagInput } from '@/lib/api/tags';

export const tagKeys = {
  all: (brandId: string) => ['tags', brandId] as const,
  list: (brandId: string) => ['tags', brandId, 'list'] as const,
  stats: (brandId: string) => ['tags', brandId, 'stats'] as const,
  detail: (brandId: string, tagId: string) =>
    ['tags', brandId, tagId] as const,
};

export function useTags(brandId: string) {
  return useQuery({
    queryKey: tagKeys.list(brandId),
    queryFn: () => tagsApi.list(brandId),
    enabled: !!brandId,
  });
}

export function useTagStats(brandId: string) {
  return useQuery({
    queryKey: tagKeys.stats(brandId),
    queryFn: () => tagsApi.getStats(brandId),
    enabled: !!brandId,
  });
}

export function useCreateTag(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTagInput) =>
      tagsApi.create(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all(brandId) });
    },
  });
}

export function useUpdateTag(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, data }: { tagId: string; data: UpdateTagInput }) =>
      tagsApi.update(brandId, tagId, data),
    onSuccess: (_, { tagId }) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: tagKeys.detail(brandId, tagId),
      });
      // Also invalidate ticket queries since tickets may display tag data
      queryClient.invalidateQueries({ queryKey: ['tickets', brandId] });
    },
  });
}

export function useDeleteTag(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) =>
      tagsApi.delete(brandId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all(brandId) });
      // Also invalidate ticket queries since tickets may reference deleted tag
      queryClient.invalidateQueries({ queryKey: ['tickets', brandId] });
    },
  });
}

export function useMergeTags(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetTagId,
      sourceTagIds,
    }: {
      targetTagId: string;
      sourceTagIds: string[];
    }) => tagsApi.merge(brandId, sourceTagIds, targetTagId),
    onSuccess: () => {
      // Invalidate all tag queries since multiple tags are affected
      queryClient.invalidateQueries({ queryKey: tagKeys.all(brandId) });
      // Also invalidate ticket queries since tickets may reference merged tags
      queryClient.invalidateQueries({ queryKey: ['tickets', brandId] });
    },
  });
}
