'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { DashboardTicketFilters } from '@/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  tickets: (filters?: DashboardTicketFilters) =>
    ['dashboard', 'tickets', filters] as const,
  stats: (brandIds?: string[]) =>
    ['dashboard', 'stats', brandIds] as const,
  trends: (options?: { brandIds?: string[]; days?: number }) =>
    ['dashboard', 'trends', options] as const,
};

export function useDashboardTickets(filters?: DashboardTicketFilters) {
  return useQuery({
    queryKey: dashboardKeys.tickets(filters),
    queryFn: () => dashboardApi.listTickets(filters),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

export function useDashboardStats(brandIds?: string[]) {
  return useQuery({
    queryKey: dashboardKeys.stats(brandIds),
    queryFn: () => dashboardApi.getStats(brandIds),
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
