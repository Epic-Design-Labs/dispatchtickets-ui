'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { presenceApi, PresenceStatus } from '@/lib/api/presence';

export const presenceKeys = {
  all: ['presence'] as const,
  mine: ['presence', 'me'] as const,
  team: ['presence', 'team'] as const,
};

export function useMyPresence() {
  return useQuery({
    queryKey: presenceKeys.mine,
    queryFn: presenceApi.mine,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useSetMyPresence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: PresenceStatus) => presenceApi.setMine(status),
    onSuccess: (data) => {
      queryClient.setQueryData(presenceKeys.mine, data);
      queryClient.invalidateQueries({ queryKey: presenceKeys.team });
    },
  });
}

/** Everyone's presence, for the Team page. Live updates arrive as presence.changed. */
export function useTeamPresence() {
  return useQuery({
    queryKey: presenceKeys.team,
    queryFn: presenceApi.team,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
