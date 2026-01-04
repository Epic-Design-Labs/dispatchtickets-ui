'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { domainsApi, AddDomainData, UpdateDomainData } from '@/lib/api/domains';

export const domainKeys = {
  all: ['domains'] as const,
  list: (brandId: string) => ['domains', 'list', brandId] as const,
  detail: (brandId: string, domainId: string) =>
    ['domains', 'detail', brandId, domainId] as const,
};

/**
 * Hook to list all domains for a brand
 */
export function useDomains(brandId: string) {
  return useQuery({
    queryKey: domainKeys.list(brandId),
    queryFn: () => domainsApi.list(brandId),
    enabled: !!brandId,
  });
}

/**
 * Hook to add a new domain
 */
export function useAddDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      brandId,
      data,
    }: {
      brandId: string;
      data: AddDomainData;
    }) => domainsApi.add(brandId, data),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list(brandId) });
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
      brandId,
      domainId,
    }: {
      brandId: string;
      domainId: string;
    }) => domainsApi.verify(brandId, domainId),
    onSuccess: (result, { brandId }) => {
      // Only invalidate if verification succeeded - this refreshes the domain list
      // If verification failed, we don't want to refetch as it might lose DNS records
      if (result.verified) {
        queryClient.invalidateQueries({ queryKey: domainKeys.list(brandId) });
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
      brandId,
      domainId,
      data,
    }: {
      brandId: string;
      domainId: string;
      data: UpdateDomainData;
    }) => domainsApi.update(brandId, domainId, data),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list(brandId) });
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
      brandId,
      domainId,
    }: {
      brandId: string;
      domainId: string;
    }) => domainsApi.remove(brandId, domainId),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list(brandId) });
    },
  });
}
