import { apiClient } from './client';
import { Webhook, CreateWebhookInput } from '@/types';

export const webhooksApi = {
  list: async (workspaceId: string): Promise<Webhook[]> => {
    const response = await apiClient.get<Webhook[]>(
      `/workspaces/${workspaceId}/webhooks`
    );
    return response.data;
  },

  create: async (
    workspaceId: string,
    data: CreateWebhookInput
  ): Promise<Webhook> => {
    const response = await apiClient.post<Webhook>(
      `/workspaces/${workspaceId}/webhooks`,
      data
    );
    return response.data;
  },

  delete: async (workspaceId: string, webhookId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/webhooks/${webhookId}`);
  },
};
