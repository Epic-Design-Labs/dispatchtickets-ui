'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fieldsApi } from '@/lib/api/fields';
import {
  EntityType,
  CreateFieldInput,
  UpdateFieldInput,
} from '@/types';

export const fieldKeys = {
  all: (brandId: string) => ['fields', brandId] as const,
  entity: (brandId: string, entityType: EntityType) =>
    ['fields', brandId, entityType] as const,
};

/**
 * Get all field definitions for a brand
 */
export function useFields(brandId: string) {
  return useQuery({
    queryKey: fieldKeys.all(brandId),
    queryFn: () => fieldsApi.getAll(brandId),
    enabled: !!brandId,
  });
}

/**
 * Get field definitions for a specific entity type
 */
export function useFieldsByEntity(brandId: string, entityType: EntityType) {
  return useQuery({
    queryKey: fieldKeys.entity(brandId, entityType),
    queryFn: () => fieldsApi.getByEntity(brandId, entityType),
    enabled: !!brandId && !!entityType,
  });
}

/**
 * Create a new field definition
 */
export function useCreateField(brandId: string, entityType: EntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFieldInput) =>
      fieldsApi.create(brandId, entityType, data),
    onSuccess: () => {
      // Invalidate both all fields and entity-specific queries
      queryClient.invalidateQueries({ queryKey: fieldKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: fieldKeys.entity(brandId, entityType),
      });
    },
  });
}

/**
 * Update a field definition
 */
export function useUpdateField(brandId: string, entityType: EntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: UpdateFieldInput }) =>
      fieldsApi.update(brandId, entityType, key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: fieldKeys.entity(brandId, entityType),
      });
    },
  });
}

/**
 * Delete a field definition
 */
export function useDeleteField(brandId: string, entityType: EntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => fieldsApi.delete(brandId, entityType, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: fieldKeys.entity(brandId, entityType),
      });
    },
  });
}

/**
 * Reorder field definitions
 */
export function useReorderFields(brandId: string, entityType: EntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keys: string[]) =>
      fieldsApi.reorder(brandId, entityType, keys),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: fieldKeys.entity(brandId, entityType),
      });
    },
  });
}
