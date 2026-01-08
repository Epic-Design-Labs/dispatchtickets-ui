'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { auditLogsApi, AuditLogQueryParams } from '@/lib/api';

export const auditLogKeys = {
  all: (brandId: string) => ['audit-logs', brandId] as const,
  list: (brandId: string, params?: AuditLogQueryParams) =>
    ['audit-logs', brandId, 'list', params] as const,
  ticket: (brandId: string, ticketId: string) =>
    ['audit-logs', brandId, 'ticket', ticketId] as const,
};

/**
 * Hook for paginated audit logs with infinite scroll
 */
export function useAuditLogs(
  brandId: string,
  params?: Omit<AuditLogQueryParams, 'cursor'>
) {
  return useInfiniteQuery({
    queryKey: auditLogKeys.list(brandId, params),
    queryFn: ({ pageParam }) =>
      auditLogsApi.list(brandId, { ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined,
    enabled: !!brandId,
  });
}

/**
 * Hook for single-page audit logs (non-infinite)
 */
export function useAuditLogsList(
  brandId: string,
  params?: AuditLogQueryParams
) {
  return useQuery({
    queryKey: auditLogKeys.list(brandId, params),
    queryFn: () => auditLogsApi.list(brandId, params),
    enabled: !!brandId,
  });
}

/**
 * Hook for ticket-specific audit logs
 */
export function useTicketAuditLogs(brandId: string, ticketId: string) {
  return useQuery({
    queryKey: auditLogKeys.ticket(brandId, ticketId),
    queryFn: () => auditLogsApi.getTicketLogs(brandId, ticketId),
    enabled: !!brandId && !!ticketId,
  });
}
