'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api';
import { CreateCompanyInput, UpdateCompanyInput } from '@/types';

export const companyKeys = {
  all: (workspaceId: string) => ['companies', workspaceId] as const,
  list: (workspaceId: string, params?: { search?: string }) =>
    ['companies', workspaceId, 'list', params] as const,
  detail: (workspaceId: string, companyId: string) =>
    ['companies', workspaceId, companyId] as const,
};

export function useCompanies(
  workspaceId: string,
  params?: { search?: string }
) {
  return useQuery({
    queryKey: companyKeys.list(workspaceId, params),
    queryFn: () => companiesApi.list(workspaceId, params),
    enabled: !!workspaceId,
  });
}

export function useCompany(workspaceId: string, companyId: string) {
  return useQuery({
    queryKey: companyKeys.detail(workspaceId, companyId),
    queryFn: () => companiesApi.get(workspaceId, companyId),
    enabled: !!workspaceId && !!companyId,
  });
}

export function useCreateCompany(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyInput) =>
      companiesApi.create(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all(workspaceId) });
    },
  });
}

export function useUpdateCompany(workspaceId: string, companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCompanyInput) =>
      companiesApi.update(workspaceId, companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all(workspaceId) });
      queryClient.invalidateQueries({
        queryKey: companyKeys.detail(workspaceId, companyId),
      });
    },
  });
}

export function useDeleteCompany(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) =>
      companiesApi.delete(workspaceId, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all(workspaceId) });
    },
  });
}
