'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi, UpgradeRequest, CancelRequest } from '@/lib/api/billing';

export const billingKeys = {
  plans: ['plans'] as const,
  subscription: ['subscription'] as const,
  usage: ['usage'] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: billingKeys.plans,
    queryFn: billingApi.getPlans,
    staleTime: 1000 * 60 * 60, // 1 hour - plans don't change often
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: billingKeys.subscription,
    queryFn: billingApi.getSubscription,
  });
}

export function useUsage() {
  return useQuery({
    queryKey: billingKeys.usage,
    queryFn: billingApi.getUsage,
  });
}

export function useUpgradeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpgradeRequest) => billingApi.upgrade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: CancelRequest) => billingApi.cancel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription });
    },
  });
}

export function useReactivateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => billingApi.reactivate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription });
    },
  });
}
