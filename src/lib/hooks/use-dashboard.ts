'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { DashboardTicketFilters } from '@/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  tickets: (filters?: DashboardTicketFilters) =>
    ['dashboard', 'tickets', filters] as const,
  stats: (options?: { brandIds?: string[]; days?: number }) =>
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

export function useDashboardStats(options?: { brandIds?: string[]; days?: number }) {
  return useQuery({
    queryKey: dashboardKeys.stats(options),
    queryFn: () => dashboardApi.getStats(options),
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
