import { apiClient } from './client';
import { Webhook, CreateWebhookInput } from '@/types';

export const webhooksApi = {
  list: async (brandId: string): Promise<Webhook[]> => {
    const response = await apiClient.get<Webhook[]>(
      `/brands/${brandId}/webhooks`
    );
    return response.data;
  },

  create: async (
    brandId: string,
    data: CreateWebhookInput
  ): Promise<Webhook> => {
    const response = await apiClient.post<Webhook>(
      `/brands/${brandId}/webhooks`,
      data
    );
    return response.data;
  },

  delete: async (brandId: string, webhookId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/webhooks/${webhookId}`);
  },
};
