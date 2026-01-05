'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailConnectionsApi } from '@/lib/api/email-connections';

export const emailConnectionKeys = {
  all: ['email-connections'] as const,
  detail: (brandId: string) => ['email-connections', brandId] as const,
};

/**
 * Hook to get the email connection for a brand
 */
export function useEmailConnection(brandId: string) {
  return useQuery({
    queryKey: emailConnectionKeys.detail(brandId),
    queryFn: () => emailConnectionsApi.get(brandId),
    enabled: !!brandId,
  });
}

/**
 * Hook to initiate Gmail OAuth
 */
export function useConnectGmail() {
  return useMutation({
    mutationFn: (brandId: string) => emailConnectionsApi.authorizeGmail(brandId),
    onSuccess: (data) => {
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    },
  });
}

/**
 * Hook to disconnect email connection
 */
export function useDisconnectEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (brandId: string) => emailConnectionsApi.disconnect(brandId),
    onSuccess: (_, brandId) => {
      queryClient.invalidateQueries({ queryKey: emailConnectionKeys.detail(brandId) });
    },
  });
}

/**
 * Hook to trigger manual sync
 */
export function useSyncEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (brandId: string) => emailConnectionsApi.sync(brandId),
    onSuccess: (_, brandId) => {
      queryClient.invalidateQueries({ queryKey: emailConnectionKeys.detail(brandId) });
    },
  });
}
