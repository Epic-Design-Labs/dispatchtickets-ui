'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { DashboardTicketFilters } from '@/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  tickets: (filters?: DashboardTicketFilters) =>
    ['dashboard', 'tickets', filters] as const,
  stats: (workspaceIds?: string[]) =>
    ['dashboard', 'stats', workspaceIds] as const,
};

export function useDashboardTickets(filters?: DashboardTicketFilters) {
  return useQuery({
    queryKey: dashboardKeys.tickets(filters),
    queryFn: () => dashboardApi.listTickets(filters),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

export function useDashboardStats(workspaceIds?: string[]) {
  return useQuery({
    queryKey: dashboardKeys.stats(workspaceIds),
    queryFn: () => dashboardApi.getStats(workspaceIds),
    staleTime: 60000, // Consider stats fresh for 1 minute
  });
}
