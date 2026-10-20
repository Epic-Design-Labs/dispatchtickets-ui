import { cn } from '@/lib/utils';
import type { PresenceStatus } from '@/lib/api/presence';

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  available: 'Available',
  busy: 'Busy',
  away: 'Away',
  offline: 'Offline',
};

const COLORS: Record<PresenceStatus, string> = {
  available: 'bg-green-500',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
  offline: 'bg-gray-400',
};

export function PresenceDot({ status, className }: { status: PresenceStatus; className?: string }) {
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', COLORS[status], className)} />;
}
