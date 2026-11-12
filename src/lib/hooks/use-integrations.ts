'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '@/lib/api/integrations';

export const integrationKeys = {
  installations: ['integrations', 'installations'] as const,
};

export function useInstallations() {
  return useQuery({
    queryKey: integrationKeys.installations,
    queryFn: integrationsApi.listInstallations,
  });
}

export function useUpdateInstallationBrands() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ installationId, brandIds }: { installationId: string; brandIds: string[] }) =>
      integrationsApi.updateBrands(installationId, brandIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.installations }),
  });
}

export function useDisconnectInstallation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (installationId: string) => integrationsApi.disconnect(installationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.installations }),
  });
}
