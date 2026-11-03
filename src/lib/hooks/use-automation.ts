'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationApi } from '@/lib/api/automation';
import type { RuleInput, RuleTestInput } from '@/types/automation';

export const automationKeys = {
  all: (brandId: string) => ['automation-rules', brandId] as const,
};

export function useAutomationRules(brandId: string) {
  return useQuery({
    queryKey: automationKeys.all(brandId),
    queryFn: () => automationApi.list(brandId),
    enabled: !!brandId,
    staleTime: 60_000,
  });
}

export function useCreateAutomationRule(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RuleInput) => automationApi.create(brandId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: automationKeys.all(brandId) }),
  });
}

export function useUpdateAutomationRule(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RuleInput> }) =>
      automationApi.update(brandId, id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: automationKeys.all(brandId) }),
  });
}

export function useDeleteAutomationRule(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationApi.delete(brandId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: automationKeys.all(brandId) }),
  });
}

export function useReorderAutomationRules(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleIds: string[]) => automationApi.reorder(brandId, ruleIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: automationKeys.all(brandId) }),
  });
}

/**
 * The dry run. Not a query: it is run on demand against an unsaved draft, so
 * caching it by key would mean showing a preview of a rule the person has
 * since edited.
 */
export function useTestAutomationRule(brandId: string) {
  return useMutation({
    mutationFn: (data: RuleTestInput) => automationApi.test(brandId, data),
  });
}
