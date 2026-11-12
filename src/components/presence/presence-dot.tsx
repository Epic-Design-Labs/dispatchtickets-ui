import { cn } from '@/lib/utils';
import type { PresenceStatus } from '@/lib/api/presence';

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  available: 'Available',
  busy: 'Busy',
  away: 'Away',
  offline: 'Offline',
};

/**
 * Solid fills, not the soft ones the chips use: this dot is 8px across with no
 * text beside it, so the colour IS the message and a tint would read as grey
 * at that size. Offline takes `subtle` rather than a palette grey because it is
 * the one of the four that has to stay readable against a dark surface, and the
 * token carries a dark value where `gray-400` does not.
 */
const COLORS: Record<PresenceStatus, string> = {
  available: 'bg-success',
  busy: 'bg-danger',
  away: 'bg-warning',
  offline: 'bg-subtle',
};

export function PresenceDot({ status, className }: { status: PresenceStatus; className?: string }) {
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', COLORS[status], className)} />;
}
