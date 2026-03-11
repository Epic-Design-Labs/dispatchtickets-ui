import { apiClient } from './client';
import {
  RecurringTicket,
  RecurringTicketListResponse,
  CreateRecurringTicketInput,
  UpdateRecurringTicketInput,
  ListRecurringTicketsParams,
} from '@/types';
import { Ticket } from '@/types';

function buildParams(params?: Record<string, unknown>): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return searchParams;
}

export const recurringTicketsApi = {
  list: async (
    brandId: string,
    params?: ListRecurringTicketsParams,
  ): Promise<RecurringTicketListResponse> => {
    const response = await apiClient.get<RecurringTicketListResponse>(
      `/brands/${brandId}/recurring-tickets`,
      { params: buildParams(params as Record<string, unknown>) },
    );
    return response.data;
  },

  getById: async (
    brandId: string,
    id: string,
  ): Promise<RecurringTicket> => {
    const response = await apiClient.get<RecurringTicket>(
      `/brands/${brandId}/recurring-tickets/${id}`,
    );
    return response.data;
  },

  create: async (
    brandId: string,
    data: CreateRecurringTicketInput,
  ): Promise<RecurringTicket> => {
    const response = await apiClient.post<RecurringTicket>(
      `/brands/${brandId}/recurring-tickets`,
      data,
    );
    return response.data;
  },

  update: async (
    brandId: string,
    id: string,
    data: UpdateRecurringTicketInput,
  ): Promise<RecurringTicket> => {
    const response = await apiClient.patch<RecurringTicket>(
      `/brands/${brandId}/recurring-tickets/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (brandId: string, id: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/recurring-tickets/${id}`);
  },

  pause: async (brandId: string, id: string): Promise<RecurringTicket> => {
    const response = await apiClient.post<RecurringTicket>(
      `/brands/${brandId}/recurring-tickets/${id}/pause`,
    );
    return response.data;
  },

  resume: async (brandId: string, id: string): Promise<RecurringTicket> => {
    const response = await apiClient.post<RecurringTicket>(
      `/brands/${brandId}/recurring-tickets/${id}/resume`,
    );
    return response.data;
  },

  triggerManually: async (
    brandId: string,
    id: string,
  ): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(
      `/brands/${brandId}/recurring-tickets/${id}/run`,
    );
    return response.data;
  },
};
