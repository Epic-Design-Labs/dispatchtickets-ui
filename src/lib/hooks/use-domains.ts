'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { domainsApi } from '@/lib/api/domains';

export const domainKeys = {
  all: ['domains'] as const,
  detail: (workspaceId: string) => ['domains', workspaceId] as const,
};

export function useDomains(workspaceId: string) {
  return useQuery({
    queryKey: domainKeys.detail(workspaceId),
    queryFn: () => domainsApi.get(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useSetInboundDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, domain }: { workspaceId: string; domain: string }) =>
      domainsApi.setInboundDomain(workspaceId, domain),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(workspaceId) });
    },
  });
}

export function useVerifyInboundDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => domainsApi.verifyInboundDomain(workspaceId),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(workspaceId) });
    },
  });
}

export function useRemoveInboundDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => domainsApi.removeInboundDomain(workspaceId),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(workspaceId) });
    },
  });
}

export function useSetOutboundDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, domain }: { workspaceId: string; domain: string }) =>
      domainsApi.setOutboundDomain(workspaceId, domain),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(workspaceId) });
    },
  });
}

export function useVerifyOutboundDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => domainsApi.verifyOutboundDomain(workspaceId),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(workspaceId) });
    },
  });
}

export function useUpdateSender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: { fromEmail?: string; fromName?: string };
    }) => domainsApi.updateSender(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(workspaceId) });
    },
  });
}

export function useRemoveOutboundDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => domainsApi.removeOutboundDomain(workspaceId),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(workspaceId) });
    },
  });
}
