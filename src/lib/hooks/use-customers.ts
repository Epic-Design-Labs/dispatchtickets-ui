'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { CreateCustomerInput, UpdateCustomerInput } from '@/types';

export const customerKeys = {
  all: (brandId: string) => ['customers', brandId] as const,
  list: (brandId: string, params?: { search?: string; companyId?: string }) =>
    ['customers', brandId, 'list', params] as const,
  detail: (brandId: string, customerId: string) =>
    ['customers', brandId, customerId] as const,
  search: (brandId: string, query: string) =>
    ['customers', brandId, 'search', query] as const,
};

export function useCustomers(
  brandId: string,
  params?: { search?: string; companyId?: string }
) {
  return useQuery({
    queryKey: customerKeys.list(brandId, params),
    queryFn: () => customersApi.list(brandId, params),
    enabled: !!brandId,
  });
}

export function useCustomer(brandId: string, customerId: string) {
  return useQuery({
    queryKey: customerKeys.detail(brandId, customerId),
    queryFn: () => customersApi.get(brandId, customerId),
    enabled: !!brandId && !!customerId,
  });
}

export function useCustomerSearch(brandId: string, query: string) {
  return useQuery({
    queryKey: customerKeys.search(brandId, query),
    queryFn: () => customersApi.search(brandId, query),
    enabled: !!brandId && query.length >= 2,
  });
}

export function useCreateCustomer(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInput) =>
      customersApi.create(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all(brandId) });
    },
  });
}

export function useUpdateCustomer(brandId: string, customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCustomerInput) =>
      customersApi.update(brandId, customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(brandId, customerId),
      });
    },
  });
}

export function useDeleteCustomer(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) =>
      customersApi.delete(brandId, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all(brandId) });
    },
  });
}
