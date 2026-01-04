import { apiClient } from './client';
import { ApiKey, CreateApiKeyInput, UpdateApiKeyScopeInput } from '@/types/api-key';

export const apiKeysApi = {
  list: async (): Promise<ApiKey[]> => {
    const response = await apiClient.get<ApiKey[]>('/accounts/me/api-keys');
    return response.data;
  },

  create: async (data: CreateApiKeyInput): Promise<ApiKey> => {
    const response = await apiClient.post<ApiKey>('/accounts/me/api-keys', data);
    return response.data;
  },

  updateScope: async (keyId: string, data: UpdateApiKeyScopeInput): Promise<{ success: boolean }> => {
    const response = await apiClient.patch<{ success: boolean }>(
      `/accounts/me/api-keys/${keyId}/scope`,
      data
    );
    return response.data;
  },

  revoke: async (keyId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/accounts/me/api-keys/${keyId}`
    );
    return response.data;
  },
};
