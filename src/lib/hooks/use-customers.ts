'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { CreateCustomerInput, UpdateCustomerInput } from '@/types';

export const customerKeys = {
  all: (workspaceId: string) => ['customers', workspaceId] as const,
  list: (workspaceId: string, params?: { search?: string; companyId?: string }) =>
    ['customers', workspaceId, 'list', params] as const,
  detail: (workspaceId: string, customerId: string) =>
    ['customers', workspaceId, customerId] as const,
  search: (workspaceId: string, query: string) =>
    ['customers', workspaceId, 'search', query] as const,
};

export function useCustomers(
  workspaceId: string,
  params?: { search?: string; companyId?: string }
) {
  return useQuery({
    queryKey: customerKeys.list(workspaceId, params),
    queryFn: () => customersApi.list(workspaceId, params),
    enabled: !!workspaceId,
  });
}

export function useCustomer(workspaceId: string, customerId: string) {
  return useQuery({
    queryKey: customerKeys.detail(workspaceId, customerId),
    queryFn: () => customersApi.get(workspaceId, customerId),
    enabled: !!workspaceId && !!customerId,
  });
}

export function useCustomerSearch(workspaceId: string, query: string) {
  return useQuery({
    queryKey: customerKeys.search(workspaceId, query),
    queryFn: () => customersApi.search(workspaceId, query),
    enabled: !!workspaceId && query.length >= 2,
  });
}

export function useCreateCustomer(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInput) =>
      customersApi.create(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all(workspaceId) });
    },
  });
}

export function useUpdateCustomer(workspaceId: string, customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCustomerInput) =>
      customersApi.update(workspaceId, customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all(workspaceId) });
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(workspaceId, customerId),
      });
    },
  });
}

export function useDeleteCustomer(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) =>
      customersApi.delete(workspaceId, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all(workspaceId) });
    },
  });
}
