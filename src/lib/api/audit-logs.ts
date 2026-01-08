import { apiClient } from './client';
import { AuditLog, AuditLogListResponse } from '@/types';

export interface AuditLogQueryParams {
  entityType?: string;
  entityId?: string;
  event?: string;
  cursor?: string;
  limit?: number;
}

export const auditLogsApi = {
  /**
   * List audit logs for a brand with optional filtering
   */
  list: async (
    brandId: string,
    params?: AuditLogQueryParams
  ): Promise<AuditLogListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.entityType) searchParams.set('entityType', params.entityType);
    if (params?.entityId) searchParams.set('entityId', params.entityId);
    if (params?.event) searchParams.set('event', params.event);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    const url = `/brands/${brandId}/logs${query ? `?${query}` : ''}`;

    const response = await apiClient.get<AuditLogListResponse>(url);
    return response.data;
  },

  /**
   * Get audit logs for a specific ticket
   */
  getTicketLogs: async (
    brandId: string,
    ticketId: string
  ): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLog[]>(
      `/brands/${brandId}/tickets/${ticketId}/logs`
    );
    return response.data;
  },
};
