'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailConnectionsApi } from '@/lib/api/email-connections';

export const emailConnectionKeys = {
  all: ['email-connections'] as const,
  list: (brandId: string) => ['email-connections', brandId] as const,
  detail: (brandId: string, connectionId: string) =>
    ['email-connections', brandId, connectionId] as const,
};

/**
 * Hook to get all email connections for a brand
 */
export function useEmailConnections(brandId: string) {
  return useQuery({
    queryKey: emailConnectionKeys.list(brandId),
    queryFn: () => emailConnectionsApi.list(brandId),
    enabled: !!brandId,
  });
}

/**
 * Hook to get a specific email connection
 */
export function useEmailConnection(brandId: string, connectionId: string) {
  return useQuery({
    queryKey: emailConnectionKeys.detail(brandId, connectionId),
    queryFn: () => emailConnectionsApi.get(brandId, connectionId),
    enabled: !!brandId && !!connectionId,
  });
}

/**
 * Hook to initiate Gmail OAuth to add a new connection
 */
export function useConnectGmail() {
  return useMutation({
    mutationFn: ({ brandId, connectionName }: { brandId: string; connectionName?: string }) =>
      emailConnectionsApi.authorizeGmail(brandId, connectionName),
    onSuccess: (data) => {
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    },
  });
}

/**
 * Hook to update connection settings
 */
export function useUpdateEmailConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      brandId,
      connectionId,
      data,
    }: {
      brandId: string;
      connectionId: string;
      data: { name?: string };
    }) => emailConnectionsApi.update(brandId, connectionId, data),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: emailConnectionKeys.list(brandId) });
    },
  });
}

/**
 * Hook to set connection as primary
 */
export function useSetPrimaryConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, connectionId }: { brandId: string; connectionId: string }) =>
      emailConnectionsApi.setPrimary(brandId, connectionId),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: emailConnectionKeys.list(brandId) });
    },
  });
}

/**
 * Hook to disconnect email connection
 */
export function useDisconnectEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, connectionId }: { brandId: string; connectionId: string }) =>
      emailConnectionsApi.disconnect(brandId, connectionId),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: emailConnectionKeys.list(brandId) });
    },
  });
}

/**
 * Hook to trigger manual sync for all connections
 */
export function useSyncAllEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, full }: { brandId: string; full?: boolean }) =>
      emailConnectionsApi.syncAll(brandId, full),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: emailConnectionKeys.list(brandId) });
    },
  });
}

/**
 * Hook to trigger manual sync for a specific connection
 */
export function useSyncEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      brandId,
      connectionId,
      full,
    }: {
      brandId: string;
      connectionId?: string;
      full?: boolean;
    }) => {
      if (connectionId) {
        return emailConnectionsApi.sync(brandId, connectionId, full);
      }
      return emailConnectionsApi.syncAll(brandId, full);
    },
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: emailConnectionKeys.list(brandId) });
    },
  });
}

/**
 * Hook to retry a failed connection - resets error status and syncs
 */
export function useRetryConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, connectionId }: { brandId: string; connectionId: string }) =>
      emailConnectionsApi.retry(brandId, connectionId),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: emailConnectionKeys.list(brandId) });
    },
  });
}

/**
 * Hook to initiate OAuth reconnection for a disconnected connection
 */
export function useReconnectEmail() {
  return useMutation({
    mutationFn: ({ brandId, connectionId }: { brandId: string; connectionId: string }) =>
      emailConnectionsApi.reconnect(brandId, connectionId),
    onSuccess: (data) => {
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    },
  });
}
