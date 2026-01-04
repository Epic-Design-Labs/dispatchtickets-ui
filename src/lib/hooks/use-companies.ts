'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api';
import { CreateCompanyInput, UpdateCompanyInput } from '@/types';

export const companyKeys = {
  all: (brandId: string) => ['companies', brandId] as const,
  list: (brandId: string, params?: { search?: string }) =>
    ['companies', brandId, 'list', params] as const,
  detail: (brandId: string, companyId: string) =>
    ['companies', brandId, companyId] as const,
};

export function useCompanies(
  brandId: string,
  params?: { search?: string }
) {
  return useQuery({
    queryKey: companyKeys.list(brandId, params),
    queryFn: () => companiesApi.list(brandId, params),
    enabled: !!brandId,
  });
}

export function useCompany(brandId: string, companyId: string) {
  return useQuery({
    queryKey: companyKeys.detail(brandId, companyId),
    queryFn: () => companiesApi.get(brandId, companyId),
    enabled: !!brandId && !!companyId,
  });
}

export function useCreateCompany(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyInput) =>
      companiesApi.create(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all(brandId) });
    },
  });
}

export function useUpdateCompany(brandId: string, companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCompanyInput) =>
      companiesApi.update(brandId, companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: companyKeys.detail(brandId, companyId),
      });
    },
  });
}

export function useDeleteCompany(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) =>
      companiesApi.delete(brandId, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all(brandId) });
    },
  });
}
