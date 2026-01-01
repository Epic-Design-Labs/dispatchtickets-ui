'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureRequestsApi, CreateFeatureRequestInput } from '@/lib/api/feature-requests';

export const featureRequestKeys = {
  all: ['feature-requests'] as const,
  list: (params?: { status?: string; sortBy?: string }) =>
    ['feature-requests', 'list', params] as const,
  activity: ['feature-requests', 'activity'] as const,
};

export function useFeatureRequests(params?: {
  status?: string;
  sortBy?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: featureRequestKeys.list(params),
    queryFn: () => featureRequestsApi.list(params),
  });
}

export function useFeatureActivity() {
  return useQuery({
    queryKey: featureRequestKeys.activity,
    queryFn: () => featureRequestsApi.getActivity(),
  });
}

export function useCreateFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFeatureRequestInput) =>
      featureRequestsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.all });
    },
  });
}

export function useVoteFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => featureRequestsApi.vote(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.all });
    },
  });
}

export function useUnvoteFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => featureRequestsApi.unvote(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.all });
    },
  });
}
