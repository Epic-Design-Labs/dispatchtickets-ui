import { cn } from '@/lib/utils';
import { softFill } from '@/lib/soft-color';
import { TicketStatusObject } from '@/types/status';
import { Pill } from './pill';

type StatusKey = 'open' | 'pending' | 'resolved' | 'closed' | 'spam' | string;

/**
 * Fallback styling for the four system statuses plus spam, used when a ticket
 * carries no matching status row to take a colour from.
 *
 * These map onto the status tokens rather than raw Tailwind palette steps, so
 * the soft fill and the text colour move together -- amber text on an amber
 * tint fails contrast, which is why `--warning-foreground` exists separately
 * from `--warning`.
 *
 * Closed stays green rather than the grey a status that is merely "finished"
 * might suggest: #22c55e is the documented colour for closed across the app
 * (CLAUDE.md note 10) and it is what the API seeds onto every new brand's
 * closed status, so a grey fallback would disagree with the colour most real
 * brands actually render from.
 */
const statusDefaults: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-info-soft text-info' },
  pending: { label: 'Pending', className: 'bg-warning-soft text-warning-foreground' },
  resolved: { label: 'Resolved', className: 'bg-success-soft text-success-foreground' },
  closed: { label: 'Closed', className: 'bg-success-soft text-success-foreground' },
  spam: { label: 'Spam', className: 'bg-danger-soft text-danger' },
};

interface StatusBadgeProps {
  /** Status key (e.g., 'open', 'pending') - for backwards compatibility */
  status: StatusKey;
  /** Full status object with custom color - takes precedence if provided */
  statusRef?: TicketStatusObject | null;
  className?: string;
}

export function StatusBadge({ status, statusRef, className }: StatusBadgeProps) {
  // Always use the status key as the source of truth.
  // Only use statusRef for color/name if it matches the current status key.
  // This prevents stale statusRef from showing wrong status after updates.
  const defaults = statusDefaults[status];
  const statusRefMatchesKey = statusRef?.key === status;

  // A brand's own colour wins wherever we have one that belongs to this status.
  if (statusRefMatchesKey && statusRef?.color) {
    const fill = softFill(statusRef.color);
    if (fill) {
      return (
        <Pill className={className} style={{ backgroundColor: fill.background, color: fill.color }}>
          {statusRef.name}
        </Pill>
      );
    }
  }

  if (defaults) {
    return <Pill className={cn(defaults.className, className)}>{defaults.label}</Pill>;
  }

  // A custom status whose key no longer matches the ticket's: still better to
  // show its colour than to fall through to grey.
  if (statusRef?.color) {
    const fill = softFill(statusRef.color);
    if (fill) {
      return (
        <Pill className={className} style={{ backgroundColor: fill.background, color: fill.color }}>
          {statusRef.name || status}
        </Pill>
      );
    }
  }

  return <Pill className={cn('bg-secondary text-muted-foreground', className)}>{status}</Pill>;
}
