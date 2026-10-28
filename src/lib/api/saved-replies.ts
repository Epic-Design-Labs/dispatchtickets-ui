import { apiClient } from './client';
import type { SavedReply, SavedReplyInput } from '@/types';

export const savedRepliesApi = {
  list: async (brandId: string): Promise<SavedReply[]> => {
    const response = await apiClient.get<SavedReply[]>(`/brands/${brandId}/saved-replies`);
    return response.data;
  },

  create: async (brandId: string, data: SavedReplyInput): Promise<SavedReply> => {
    const response = await apiClient.post<SavedReply>(`/brands/${brandId}/saved-replies`, data);
    return response.data;
  },

  update: async (brandId: string, id: string, data: Partial<SavedReplyInput>): Promise<SavedReply> => {
    const response = await apiClient.patch<SavedReply>(`/brands/${brandId}/saved-replies/${id}`, data);
    return response.data;
  },

  delete: async (brandId: string, id: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/saved-replies/${id}`);
  },
};
