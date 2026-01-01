import { apiClient } from './client';
import {
  Ticket,
  CreateTicketInput,
  UpdateTicketInput,
  TicketFilters,
  PaginatedResponse,
} from '@/types';

export const ticketsApi = {
  list: async (
    workspaceId: string,
    filters?: TicketFilters
  ): Promise<PaginatedResponse<Ticket>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await apiClient.get<PaginatedResponse<Ticket>>(
      `/workspaces/${workspaceId}/tickets`,
      { params }
    );
    return response.data;
  },

  get: async (workspaceId: string, ticketId: string): Promise<Ticket> => {
    const response = await apiClient.get<Ticket>(
      `/workspaces/${workspaceId}/tickets/${ticketId}`
    );
    return response.data;
  },

  create: async (
    workspaceId: string,
    data: CreateTicketInput
  ): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(
      `/workspaces/${workspaceId}/tickets`,
      data
    );
    return response.data;
  },

  update: async (
    workspaceId: string,
    ticketId: string,
    data: UpdateTicketInput
  ): Promise<Ticket> => {
    const response = await apiClient.patch<Ticket>(
      `/workspaces/${workspaceId}/tickets/${ticketId}`,
      data
    );
    return response.data;
  },

  delete: async (workspaceId: string, ticketId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/tickets/${ticketId}`);
  },

  markAsSpam: async (
    workspaceId: string,
    ticketId: string,
    isSpam: boolean
  ): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(
      `/workspaces/${workspaceId}/tickets/${ticketId}/spam`,
      { isSpam }
    );
    return response.data;
  },
};
