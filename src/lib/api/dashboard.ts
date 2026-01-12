import { apiClient } from './client';
import {
  DashboardTicket,
  DashboardTicketFilters,
  DashboardStats,
  TicketTrends,
  PaginatedResponse,
  TeamMetricsResponse,
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

  /**
   * Get ticket volume trends over time
   */
  getTrends: async (options?: { brandIds?: string[]; days?: number }): Promise<TicketTrends> => {
    const params = new URLSearchParams();
    if (options?.brandIds?.length) {
      params.append('brandIds', options.brandIds.join(','));
    }
    if (options?.days) {
      params.append('days', String(options.days));
    }
    const response = await apiClient.get<TicketTrends>('/tickets/trends', {
      params,
    });
    return response.data;
  },

  /**
   * Get team performance metrics (resolved tickets and CSAT scores)
   */
  getTeamMetrics: async (options?: {
    brandIds?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<TeamMetricsResponse> => {
    const params = new URLSearchParams();
    if (options?.brandIds?.length) {
      params.append('brandIds', options.brandIds.join(','));
    }
    if (options?.startDate) {
      params.append('startDate', options.startDate);
    }
    if (options?.endDate) {
      params.append('endDate', options.endDate);
    }
    const response = await apiClient.get<TeamMetricsResponse>('/tickets/team-metrics', {
      params,
    });
    return response.data;
  },
};
