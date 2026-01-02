'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { domainsApi, AddDomainData, UpdateDomainData } from '@/lib/api/domains';

export const domainKeys = {
  all: ['domains'] as const,
  list: (workspaceId: string) => ['domains', 'list', workspaceId] as const,
  detail: (workspaceId: string, domainId: string) =>
    ['domains', 'detail', workspaceId, domainId] as const,
};

/**
 * Hook to list all domains for a workspace
 */
export function useDomains(workspaceId: string) {
  return useQuery({
    queryKey: domainKeys.list(workspaceId),
    queryFn: () => domainsApi.list(workspaceId),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to add a new domain
 */
export function useAddDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: AddDomainData;
    }) => domainsApi.add(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list(workspaceId) });
    },
  });
}

/**
 * Hook to verify a domain
 */
export function useVerifyDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      domainId,
    }: {
      workspaceId: string;
      domainId: string;
    }) => domainsApi.verify(workspaceId, domainId),
    onSuccess: (result, { workspaceId }) => {
      // Only invalidate if verification succeeded - this refreshes the domain list
      // If verification failed, we don't want to refetch as it might lose DNS records
      if (result.verified) {
        queryClient.invalidateQueries({ queryKey: domainKeys.list(workspaceId) });
      }
    },
  });
}

/**
 * Hook to update domain settings
 */
export function useUpdateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      domainId,
      data,
    }: {
      workspaceId: string;
      domainId: string;
      data: UpdateDomainData;
    }) => domainsApi.update(workspaceId, domainId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list(workspaceId) });
    },
  });
}

/**
 * Hook to remove a domain
 */
export function useRemoveDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      domainId,
    }: {
      workspaceId: string;
      domainId: string;
    }) => domainsApi.remove(workspaceId, domainId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list(workspaceId) });
    },
  });
}
