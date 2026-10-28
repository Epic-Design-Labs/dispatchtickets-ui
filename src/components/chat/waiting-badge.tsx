'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/types';

const INACTIVE = ['resolved', 'closed', 'spam'];

function elapsed(seconds: number): string {
  if (seconds < 60) return '<1m';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * "Waiting 2m" on a chat whose visitor spoke last. The colour is the API's
 * escalation level (tickets/reply-state.ts), not worked out here, so it
 * agrees with the webhooks and alerts: quiet, then amber, then red.
 */
export function WaitingBadge({
  ticket,
  className,
}: {
  ticket: Pick<Ticket, 'source' | 'status' | 'awaitingReplySince' | 'awaitingReplyLevel' | 'chatConvertedAt'>;
  className?: string;
}) {
  const since = ticket.awaitingReplySince;
  // A chat turned into a ticket runs on email time: no chat clock.
  const active =
    ticket.source === 'chat' && !ticket.chatConvertedAt && !!since && !INACTIVE.includes(String(ticket.status));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [active]);

  if (!active) return null;

  const seconds = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const level = ticket.awaitingReplyLevel ?? 0;

  return (
    <span
      title={`The visitor has been waiting for a reply since ${new Date(since).toLocaleTimeString()}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium',
        level >= 2
          ? 'bg-red-600 text-white'
          : level === 1
            ? 'bg-amber-500 text-white'
            : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      Waiting {elapsed(seconds)}
    </span>
  );
}
