import { apiClient } from './client';
import {
  DashboardTicket,
  DashboardTicketFilters,
  DashboardStats,
  PaginatedResponse,
} from '@/types';

export const dashboardApi = {
  /**
   * List tickets across all brands
   */
  listTickets: async (
    filters?: DashboardTicketFilters
  ): Promise<PaginatedResponse<DashboardTicket>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            // Handle brandIds array
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    const response = await apiClient.get<PaginatedResponse<DashboardTicket>>(
      '/tickets',
      { params }
    );
    return response.data;
  },

  /**
   * Get ticket statistics across all brands
   */
  getStats: async (brandIds?: string[]): Promise<DashboardStats> => {
    const params = new URLSearchParams();
    if (brandIds?.length) {
      params.append('brandIds', brandIds.join(','));
    }
    const response = await apiClient.get<DashboardStats>('/tickets/stats', {
      params,
    });
    return response.data;
  },
};
