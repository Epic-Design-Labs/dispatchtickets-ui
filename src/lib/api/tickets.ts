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
    brandId: string,
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
      `/brands/${brandId}/tickets`,
      { params }
    );
    return response.data;
  },

  get: async (brandId: string, ticketId: string): Promise<Ticket> => {
    const response = await apiClient.get<Ticket>(
      `/brands/${brandId}/tickets/${ticketId}`
    );
    return response.data;
  },

  create: async (
    brandId: string,
    data: CreateTicketInput
  ): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(
      `/brands/${brandId}/tickets`,
      data
    );
    return response.data;
  },

  update: async (
    brandId: string,
    ticketId: string,
    data: UpdateTicketInput
  ): Promise<Ticket> => {
    const response = await apiClient.patch<Ticket>(
      `/brands/${brandId}/tickets/${ticketId}`,
      data
    );
    return response.data;
  },

  delete: async (brandId: string, ticketId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/tickets/${ticketId}`);
  },

  markAsSpam: async (
    brandId: string,
    ticketId: string,
    isSpam: boolean
  ): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(
      `/brands/${brandId}/tickets/${ticketId}/spam`,
      { isSpam }
    );
    return response.data;
  },

  merge: async (
    brandId: string,
    targetTicketId: string,
    sourceTicketIds: string[]
  ): Promise<{ targetTicketId: string; mergedTicketIds: string[]; mergedCount: number }> => {
    const response = await apiClient.post(
      `/brands/${brandId}/tickets/${targetTicketId}/merge`,
      { sourceTicketIds }
    );
    return response.data;
  },

  bulkAction: async (
    brandId: string,
    action: 'spam' | 'resolve' | 'close' | 'delete',
    ticketIds: string[]
  ): Promise<{ success: number; failed: number }> => {
    const response = await apiClient.post<{ success: number; failed: number }>(
      `/brands/${brandId}/tickets/bulk`,
      { action, ticketIds }
    );
    return response.data;
  },
};
