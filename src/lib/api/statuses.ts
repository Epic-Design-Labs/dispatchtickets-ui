import { apiClient } from './client';
import {
  TicketStatusObject,
  CreateStatusInput,
  UpdateStatusInput,
  StatusWithCount,
} from '@/types/status';

export const statusesApi = {
  /**
   * List all statuses for a brand
   */
  list: async (brandId: string): Promise<TicketStatusObject[]> => {
    const response = await apiClient.get<TicketStatusObject[]>(
      `/brands/${brandId}/statuses`
    );
    return response.data;
  },

  /**
   * Get status usage statistics for a brand (includes ticket counts)
   */
  getStats: async (brandId: string): Promise<StatusWithCount[]> => {
    const response = await apiClient.get<StatusWithCount[]>(
      `/brands/${brandId}/statuses/stats`
    );
    return response.data;
  },

  /**
   * Get a single status by ID
   */
  get: async (brandId: string, statusId: string): Promise<TicketStatusObject> => {
    const response = await apiClient.get<TicketStatusObject>(
      `/brands/${brandId}/statuses/${statusId}`
    );
    return response.data;
  },

  /**
   * Create a new custom status
   */
  create: async (
    brandId: string,
    data: CreateStatusInput
  ): Promise<TicketStatusObject> => {
    const response = await apiClient.post<TicketStatusObject>(
      `/brands/${brandId}/statuses`,
      data
    );
    return response.data;
  },

  /**
   * Update an existing status
   */
  update: async (
    brandId: string,
    statusId: string,
    data: UpdateStatusInput
  ): Promise<TicketStatusObject> => {
    const response = await apiClient.patch<TicketStatusObject>(
      `/brands/${brandId}/statuses/${statusId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a custom status (soft delete)
   * Note: System statuses cannot be deleted
   */
  delete: async (brandId: string, statusId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/statuses/${statusId}`);
  },

  /**
   * Reorder statuses by providing the new order of status IDs
   */
  reorder: async (brandId: string, statusIds: string[]): Promise<TicketStatusObject[]> => {
    const response = await apiClient.post<TicketStatusObject[]>(
      `/brands/${brandId}/statuses/reorder`,
      { statusIds }
    );
    return response.data;
  },
};
