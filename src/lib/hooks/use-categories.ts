'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, Category, CreateCategoryInput, UpdateCategoryInput } from '@/lib/api/categories';

export const categoryKeys = {
  all: (brandId: string) => ['categories', brandId] as const,
  list: (brandId: string) => ['categories', brandId, 'list'] as const,
  stats: (brandId: string) => ['categories', brandId, 'stats'] as const,
  detail: (brandId: string, categoryId: string) =>
    ['categories', brandId, categoryId] as const,
};

export function useCategories(brandId: string) {
  return useQuery({
    queryKey: categoryKeys.list(brandId),
    queryFn: () => categoriesApi.list(brandId),
    enabled: !!brandId,
  });
}

export function useCategoryStats(brandId: string) {
  return useQuery({
    queryKey: categoryKeys.stats(brandId),
    queryFn: () => categoriesApi.getStats(brandId),
    enabled: !!brandId,
  });
}

export function useCreateCategory(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryInput) =>
      categoriesApi.create(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all(brandId) });
    },
  });
}

export function useUpdateCategory(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: UpdateCategoryInput }) =>
      categoriesApi.update(brandId, categoryId, data),
    onSuccess: (_, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: categoryKeys.detail(brandId, categoryId),
      });
      // Also invalidate ticket queries since tickets may display category data
      queryClient.invalidateQueries({ queryKey: ['tickets', brandId] });
    },
  });
}

export function useDeleteCategory(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) =>
      categoriesApi.delete(brandId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all(brandId) });
      // Also invalidate ticket queries since tickets may reference deleted category
      queryClient.invalidateQueries({ queryKey: ['tickets', brandId] });
    },
  });
}

export function useReorderCategories(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryIds: string[]) =>
      categoriesApi.reorder(brandId, categoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all(brandId) });
    },
  });
}
