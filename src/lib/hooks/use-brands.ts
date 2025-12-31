'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { brandsApi } from '@/lib/api';
import { CreateBrandInput, UpdateBrandInput } from '@/types';

export const brandKeys = {
  all: ['brands'] as const,
  detail: (id: string) => ['brands', id] as const,
};

export function useBrands() {
  return useQuery({
    queryKey: brandKeys.all,
    queryFn: brandsApi.list,
  });
}

export function useBrand(id: string) {
  return useQuery({
    queryKey: brandKeys.detail(id),
    queryFn: () => brandsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBrandInput) => brandsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKeys.all });
    },
  });
}

export function useUpdateBrand(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBrandInput) => brandsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKeys.all });
      queryClient.invalidateQueries({ queryKey: brandKeys.detail(id) });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => brandsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKeys.all });
    },
  });
}

// Aliases for backward compatibility
export const workspaceKeys = brandKeys;
export const useWorkspaces = useBrands;
export const useWorkspace = useBrand;
export const useCreateWorkspace = useCreateBrand;
export const useUpdateWorkspace = useUpdateBrand;
export const useDeleteWorkspace = useDeleteBrand;
