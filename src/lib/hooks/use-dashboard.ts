'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import type { DashboardStatsOptions } from '@/lib/api/dashboard';
import { DashboardTicketFilters } from '@/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  tickets: (filters?: DashboardTicketFilters) =>
    ['dashboard', 'tickets', filters] as const,
  stats: (options?: DashboardStatsOptions) =>
    ['dashboard', 'stats', options] as const,
  trends: (options?: { brandIds?: string[]; days?: number }) =>
    ['dashboard', 'trends', options] as const,
  teamMetrics: (options?: { brandIds?: string[]; startDate?: string; endDate?: string }) =>
    ['dashboard', 'team-metrics', options] as const,
};

export function useDashboardTickets(filters?: DashboardTicketFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dashboardKeys.tickets(filters),
    queryFn: () => dashboardApi.listTickets(filters),
    enabled: options?.enabled !== false,
    staleTime: 60000, // Consider data fresh for 1 minute
  });
}

/**
 * The same cross-brand queue, page by page.
 *
 * The dashboard had a "Load More" button wired to nothing: it appeared
 * whenever the API said `hasMore` and did nothing when pressed, so the queues
 * silently ended at fifty tickets. The endpoint pages by cursor, so this is
 * what that button needed all along -- and the grouped layout needs it more
 * than the table did, because a group heading that says "Overdue 12" when a
 * second page holds four more is a count that is wrong rather than short.
 */
export function useDashboardTicketsPaged(
  filters?: DashboardTicketFilters,
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: [...dashboardKeys.tickets(filters), 'paged'] as const,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      dashboardApi.listTickets(pageParam ? { ...filters, cursor: pageParam } : filters),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.pagination?.hasMore ? last.pagination.nextCursor : null),
    enabled: options?.enabled !== false,
    staleTime: 60000,
  });
}

export function useDashboardStats(
  options?: DashboardStatsOptions,
  query?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: dashboardKeys.stats(options),
    queryFn: () => dashboardApi.getStats(options),
    enabled: query?.enabled !== false,
    staleTime: 60000, // Consider stats fresh for 1 minute
  });
}

export function useDashboardTrends(options?: { brandIds?: string[]; days?: number }) {
  return useQuery({
    queryKey: dashboardKeys.trends(options),
    queryFn: () => dashboardApi.getTrends(options),
    staleTime: 300000, // Consider trends fresh for 5 minutes
  });
}

export function useTeamMetrics(options?: { brandIds?: string[]; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: dashboardKeys.teamMetrics(options),
    queryFn: () => dashboardApi.getTeamMetrics(options),
    staleTime: 60000, // Consider team metrics fresh for 1 minute
  });
}
