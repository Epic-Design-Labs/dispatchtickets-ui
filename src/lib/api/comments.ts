import { apiClient } from './client';
import { Comment, CreateCommentInput, UpdateCommentInput } from '@/types';

export const commentsApi = {
  list: async (brandId: string, ticketId: string): Promise<Comment[]> => {
    const response = await apiClient.get<Comment[]>(
      `/brands/${brandId}/tickets/${ticketId}/comments`
    );
    return response.data;
  },

  create: async (
    brandId: string,
    ticketId: string,
    data: CreateCommentInput
  ): Promise<Comment> => {
    const response = await apiClient.post<Comment>(
      `/brands/${brandId}/tickets/${ticketId}/comments`,
      data
    );
    return response.data;
  },

  update: async (
    brandId: string,
    ticketId: string,
    commentId: string,
    data: UpdateCommentInput
  ): Promise<Comment> => {
    const response = await apiClient.patch<Comment>(
      `/brands/${brandId}/tickets/${ticketId}/comments/${commentId}`,
      data
    );
    return response.data;
  },

  delete: async (
    brandId: string,
    ticketId: string,
    commentId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/brands/${brandId}/tickets/${ticketId}/comments/${commentId}`
    );
  },
};
