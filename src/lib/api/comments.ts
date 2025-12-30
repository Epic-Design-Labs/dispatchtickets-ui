import { apiClient } from './client';
import { Comment, CreateCommentInput, UpdateCommentInput } from '@/types';

export const commentsApi = {
  list: async (workspaceId: string, ticketId: string): Promise<Comment[]> => {
    const response = await apiClient.get<Comment[]>(
      `/workspaces/${workspaceId}/tickets/${ticketId}/comments`
    );
    return response.data;
  },

  create: async (
    workspaceId: string,
    ticketId: string,
    data: CreateCommentInput
  ): Promise<Comment> => {
    const response = await apiClient.post<Comment>(
      `/workspaces/${workspaceId}/tickets/${ticketId}/comments`,
      data
    );
    return response.data;
  },

  update: async (
    workspaceId: string,
    ticketId: string,
    commentId: string,
    data: UpdateCommentInput
  ): Promise<Comment> => {
    const response = await apiClient.patch<Comment>(
      `/workspaces/${workspaceId}/tickets/${ticketId}/comments/${commentId}`,
      data
    );
    return response.data;
  },

  delete: async (
    workspaceId: string,
    ticketId: string,
    commentId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/workspaces/${workspaceId}/tickets/${ticketId}/comments/${commentId}`
    );
  },
};
