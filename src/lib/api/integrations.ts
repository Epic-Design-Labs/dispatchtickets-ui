import { apiClient } from './client';
import { ApproveIntegrationInput, AuthorizePreview, Installation } from '@/types/integration';

export const integrationsApi = {
  preview: async (clientId: string, redirectUri: string): Promise<AuthorizePreview> => {
    const response = await apiClient.get<AuthorizePreview>('/integrations/authorize', {
      params: { client_id: clientId, redirect_uri: redirectUri },
    });
    return response.data;
  },

  approve: async (data: ApproveIntegrationInput): Promise<{ redirectUrl: string }> => {
    const response = await apiClient.post<{ redirectUrl: string }>('/integrations/authorize', data);
    return response.data;
  },

  listInstallations: async (): Promise<Installation[]> => {
    const response = await apiClient.get<Installation[]>('/integrations/installations');
    return response.data;
  },

  updateBrands: async (installationId: string, brandIds: string[]) => {
    const response = await apiClient.patch(`/integrations/installations/${installationId}`, { brandIds });
    return response.data;
  },

  disconnect: async (installationId: string) => {
    const response = await apiClient.delete(`/integrations/installations/${installationId}`);
    return response.data;
  },
};
