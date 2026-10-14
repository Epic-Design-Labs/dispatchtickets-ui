'use client';

import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { cn, formatTimeAgo, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  EnrichmentPayload,
  EnrichmentStatus,
} from '@/lib/api/enrichment';

/**
 * Renders whatever a brand's context endpoint returned.
 *
 * This is generic by design: the shape is fixed by the server contract, so no
 * per-tenant frontend code is ever needed. The server has already validated and
 * normalized the payload — dropping non-HTTP hrefs, unknown statuses and
 * over-long values — so this component only has to lay it out.
 */

const STATUS_STYLES: Record<EnrichmentStatus, string> = {
  ok: 'text-green-600',
  warn: 'text-amber-600',
  error: 'text-red-600',
  neutral: 'text-foreground',
};

const STATUS_DOT: Record<EnrichmentStatus, string> = {
  ok: 'bg-green-500',
  warn: 'bg-amber-500',
  error: 'bg-red-500',
  neutral: 'bg-muted-foreground/40',
};

/** How old a snapshot has to be before we nudge toward refreshing it. */
const STALE_AFTER_MS = 5 * 60 * 1000;

interface EnrichmentPanelProps {
  enrichment: EnrichmentPayload | null | undefined;
  enrichedAt: string | null | undefined;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshError?: string | null;
  className?: string;
}

export function EnrichmentPanel({
  enrichment,
  enrichedAt,
  onRefresh,
  isRefreshing,
  refreshError,
  className,
}: EnrichmentPanelProps) {
  const sections = enrichment?.sections ?? [];
  const hasContent = sections.length > 0;

  // Nothing fetched and no way to fetch: the brand has no endpoint configured,
  // so showing an empty panel would just be noise.
  if (!hasContent && !onRefresh) {
    return null;
  }

  const stamped = enrichedAt ? new Date(enrichedAt) : null;
  const isStale =
    !stamped || Date.now() - stamped.getTime() > STALE_AFTER_MS;

  return (
    <div className={cn('space-y-4', className)}>
      {sections.map((section, sectionIndex) => (
        <div key={`${section.title}-${sectionIndex}`}>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {section.title}
          </h4>
          <dl className="space-y-1.5">
            {section.fields.map((field, fieldIndex) => (
              <div
                key={`${field.label}-${fieldIndex}`}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <dt className="shrink-0 text-muted-foreground">{field.label}</dt>
                <dd
                  className={cn(
                    'flex min-w-0 items-center gap-1.5 text-right font-medium',
                    field.status
                      ? STATUS_STYLES[field.status]
                      : 'text-foreground'
                  )}
                >
                  {field.status && (
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        STATUS_DOT[field.status]
                      )}
                      aria-hidden
                    />
                  )}
                  {field.href ? (
                    <a
                      href={field.href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="truncate hover:underline"
                    >
                      {field.value || field.href}
                      <ExternalLink className="ml-1 inline h-3 w-3 align-[-1px]" />
                    </a>
                  ) : (
                    <span className="truncate">{field.value}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      {!hasContent && (
        <p className="text-sm text-muted-foreground">
          No context has been fetched for this ticket yet.
        </p>
      )}

      {refreshError && (
        <p className="flex items-start gap-1.5 text-xs text-red-600">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{refreshError}</span>
        </p>
      )}

      {onRefresh && (
        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <span
            className="text-xs text-muted-foreground"
            title={stamped ? formatDateTime(stamped) : undefined}
          >
            {stamped ? `Updated ${formatTimeAgo(stamped)}` : 'Never fetched'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-7 px-2 text-xs', isStale && 'text-foreground')}
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn('mr-1 h-3 w-3', isRefreshing && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
