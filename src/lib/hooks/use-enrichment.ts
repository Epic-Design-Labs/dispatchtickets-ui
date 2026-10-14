'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  enrichmentApi,
  UpsertEnrichmentInput,
  EnrichmentProbeResult,
} from '@/lib/api/enrichment';
import { ticketKeys } from './use-tickets';

export const enrichmentKeys = {
  all: ['enrichment'] as const,
  config: (brandId: string) => ['enrichment', 'config', brandId] as const,
};

export function useEnrichment(brandId: string) {
  return useQuery({
    queryKey: enrichmentKeys.config(brandId),
    queryFn: () => enrichmentApi.get(brandId),
    enabled: !!brandId,
  });
}

export function useUpsertEnrichment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      brandId,
      data,
    }: {
      brandId: string;
      data: UpsertEnrichmentInput;
    }) => enrichmentApi.upsert(brandId, data),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: enrichmentKeys.config(brandId) });
    },
  });
}

export function useDeleteEnrichment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId }: { brandId: string }) =>
      enrichmentApi.remove(brandId),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: enrichmentKeys.config(brandId) });
    },
  });
}

export function useRotateEnrichmentSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId }: { brandId: string }) =>
      enrichmentApi.rotateSecret(brandId),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: enrichmentKeys.config(brandId) });
    },
  });
}

/**
 * Probe the endpoint without touching a ticket. Deliberately a mutation, not a
 * query: it has a side effect on the tenant's system and must only run when
 * someone presses the button.
 */
/**
 * Fetch the real signing secret. Deliberately a mutation so it only runs when
 * someone presses Reveal — the secret is role-gated and audited server-side,
 * and must not sit in a query cache.
 */
export function useRevealEnrichmentSecret() {
  return useMutation<string, Error, { brandId: string }>({
    mutationFn: ({ brandId }) => enrichmentApi.revealSecret(brandId),
  });
}

export function useTestEnrichment() {
  return useMutation<
    EnrichmentProbeResult,
    Error,
    { brandId: string; url?: string; secret?: string; ticketId?: string }
  >({
    mutationFn: ({ brandId, ...data }) => enrichmentApi.test(brandId, data),
  });
}

/** Operator-driven re-fetch from the ticket detail panel. */
export function useRefreshEnrichment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, ticketId }: { brandId: string; ticketId: string }) =>
      enrichmentApi.refresh(brandId, ticketId),
    onSuccess: (_, { brandId, ticketId }) => {
      queryClient.invalidateQueries({
        queryKey: ticketKeys.detail(brandId, ticketId),
      });
    },
  });
}
