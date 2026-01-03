import { apiClient } from './client';
import {
  DashboardTicket,
  DashboardTicketFilters,
  DashboardStats,
  PaginatedResponse,
} from '@/types';

export const dashboardApi = {
  /**
   * List tickets across all workspaces
   */
  listTickets: async (
    filters?: DashboardTicketFilters
  ): Promise<PaginatedResponse<DashboardTicket>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            // Handle workspaceIds array
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
   * Get ticket statistics across all workspaces
   */
  getStats: async (workspaceIds?: string[]): Promise<DashboardStats> => {
    const params = new URLSearchParams();
    if (workspaceIds?.length) {
      params.append('workspaceIds', workspaceIds.join(','));
    }
    const response = await apiClient.get<DashboardStats>('/tickets/stats', {
      params,
    });
    return response.data;
  },
};
