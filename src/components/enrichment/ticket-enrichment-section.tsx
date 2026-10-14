'use client';

import { Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { EnrichmentPanel } from './enrichment-panel';
import { useEnrichment, useRefreshEnrichment } from '@/lib/hooks/use-enrichment';
import type { EnrichmentPayload } from '@/lib/api/enrichment';

interface TicketEnrichmentSectionProps {
  brandId: string;
  ticketId: string;
  enrichment?: EnrichmentPayload | null;
  enrichedAt?: string | null;
}

/**
 * Right-rail section for the brand's context snapshot.
 *
 * Renders nothing at all unless the brand has an enrichment endpoint
 * configured — a brand that never set one up should not see an empty section
 * or a refresh button that cannot do anything.
 */
export function TicketEnrichmentSection({
  brandId,
  ticketId,
  enrichment,
  enrichedAt,
}: TicketEnrichmentSectionProps) {
  const { data: config } = useEnrichment(brandId);
  const refresh = useRefreshEnrichment();

  if (!config?.enabled) {
    return null;
  }

  const hasSnapshot = (enrichment?.sections?.length ?? 0) > 0;
  const result = refresh.data;

  // A refresh that reached the endpoint but came back unusable is reported
  // here rather than thrown away; the agent should know the panel is stale for
  // a reason, not silently wonder why nothing changed.
  const refreshError =
    refresh.error?.message ??
    (result && !result.ok ? result.error ?? 'Refresh failed' : null);

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Context
        </div>
        <EnrichmentPanel
          enrichment={result?.ok ? result.payload : enrichment}
          enrichedAt={result?.ok ? new Date().toISOString() : enrichedAt}
          onRefresh={() => refresh.mutate({ brandId, ticketId })}
          isRefreshing={refresh.isPending}
          refreshError={refreshError}
        />
        {!hasSnapshot && !result && (
          <p className="text-xs text-muted-foreground">
            This ticket predates your context endpoint, or the fetch did not
            succeed. Refresh to try now.
          </p>
        )}
      </div>
    </>
  );
}
