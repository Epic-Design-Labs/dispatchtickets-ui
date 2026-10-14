import { apiClient } from './client';

/** Mirrors the server contract in api/src/modules/enrichment/enrichment.contract.ts */
export type EnrichmentStatus = 'ok' | 'warn' | 'error' | 'neutral';

export interface EnrichmentField {
  label: string;
  value: string;
  href?: string;
  status?: EnrichmentStatus;
}

export interface EnrichmentSection {
  title: string;
  fields: EnrichmentField[];
}

export interface EnrichmentPayload {
  sections: EnrichmentSection[];
}

export interface EnrichmentConfig {
  id: string;
  brandId: string;
  url: string;
  /** Masked. The real secret is only available via revealSecret(). */
  secretPreview: string | null;
  hasSecret: boolean;
  enabled: boolean;
  events: string[];
  timeoutMs: number;
  failureCount: number;
  lastTriggered: string | null;
  lastFailure: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  supportedEvents: string[];
  maxTimeoutMs: number;
}

export interface UpsertEnrichmentInput {
  url: string;
  secret?: string;
  enabled?: boolean;
  events?: string[];
  timeoutMs?: number;
}

export interface EnrichmentProbeResult {
  ok: boolean;
  status?: number;
  durationMs: number;
  error?: string;
  rawBody?: string;
  payload?: EnrichmentPayload;
  warnings: string[];
}

export const enrichmentApi = {
  get: async (brandId: string): Promise<EnrichmentConfig | null> => {
    const response = await apiClient.get<EnrichmentConfig | null>(
      `/brands/${brandId}/enrichment`
    );
    return response.data;
  },

  upsert: async (
    brandId: string,
    data: UpsertEnrichmentInput
  ): Promise<EnrichmentConfig> => {
    const response = await apiClient.put<EnrichmentConfig>(
      `/brands/${brandId}/enrichment`,
      data
    );
    return response.data;
  },

  remove: async (brandId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/enrichment`);
  },

  /** Returns the new secret once; later reads only get the masked preview. */
  rotateSecret: async (
    brandId: string
  ): Promise<EnrichmentConfig & { secret: string }> => {
    const response = await apiClient.post<EnrichmentConfig & { secret: string }>(
      `/brands/${brandId}/enrichment/rotate-secret`
    );
    return response.data;
  },

  revealSecret: async (brandId: string): Promise<string> => {
    const response = await apiClient.post<{ secret: string }>(
      `/brands/${brandId}/enrichment/reveal-secret`
    );
    return response.data.secret;
  },

  test: async (
    brandId: string,
    data: { url?: string; secret?: string; ticketId?: string } = {}
  ): Promise<EnrichmentProbeResult> => {
    const response = await apiClient.post<EnrichmentProbeResult>(
      `/brands/${brandId}/enrichment/test`,
      data
    );
    return response.data;
  },

  refresh: async (
    brandId: string,
    ticketId: string
  ): Promise<EnrichmentProbeResult> => {
    const response = await apiClient.post<EnrichmentProbeResult>(
      `/brands/${brandId}/tickets/${ticketId}/enrichment/refresh`
    );
    return response.data;
  },
};
