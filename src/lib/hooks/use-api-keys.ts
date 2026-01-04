'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi } from '@/lib/api/api-keys';
import { CreateApiKeyInput, UpdateApiKeyScopeInput } from '@/types/api-key';

export const apiKeyKeys = {
  all: ['api-keys'] as const,
};

export function useApiKeys() {
  return useQuery({
    queryKey: apiKeyKeys.all,
    queryFn: apiKeysApi.list,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApiKeyInput) => apiKeysApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
    },
  });
}

export function useUpdateApiKeyScope() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keyId, data }: { keyId: string; data: UpdateApiKeyScopeInput }) =>
      apiKeysApi.updateScope(keyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyId: string) => apiKeysApi.revoke(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
    },
  });
}
