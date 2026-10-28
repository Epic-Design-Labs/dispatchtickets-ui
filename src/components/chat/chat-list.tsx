'use client';

import Link from 'next/link';
import { cn, formatTimeAgo } from '@/lib/utils';
import { WaitingBadge } from '@/components/chat/waiting-badge';
import { useUnreadChats, useVisitorTyping } from '@/lib/live/chat-activity';
import type { Ticket } from '@/types';

/**
 * The Chat tab's left column. "Waiting" is every chat whose visitor spoke
 * last, oldest first (the API's sort); "Replied" is the rest of the open chats.
 */
export function ChatList({
  brandId,
  tickets,
  selectedId,
}: {
  brandId: string;
  tickets: Ticket[];
  selectedId: string | null;
}) {
  const unread = useUnreadChats();
  const waiting = tickets.filter((t) => t.awaitingReplySince);
  const replied = tickets.filter((t) => !t.awaitingReplySince);

  if (tickets.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No open chats. New ones appear here as soon as a visitor writes in.
      </p>
    );
  }

  return (
    <div className="divide-y">
      <Section title="Waiting" count={waiting.length}>
        {waiting.map((t) => (
          <ChatRow key={t.id} brandId={brandId} ticket={t} selected={t.id === selectedId} unread={unread.has(t.id)} />
        ))}
      </Section>
      <Section title="Replied" count={replied.length}>
        {replied.map((t) => (
          <ChatRow key={t.id} brandId={brandId} ticket={t} selected={t.id === selectedId} unread={unread.has(t.id)} />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="sticky top-0 z-10 bg-gray-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} <span className="tabular-nums">({count})</span>
      </h3>
      {count === 0 ? <p className="px-4 pb-3 text-xs text-muted-foreground">None</p> : <ul>{children}</ul>}
    </section>
  );
}

function ChatRow({
  brandId,
  ticket,
  selected,
  unread,
}: {
  brandId: string;
  ticket: Ticket;
  selected: boolean;
  unread: boolean;
}) {
  const typing = useVisitorTyping(ticket.id);
  const who =
    ticket.customer?.name ||
    ticket.customer?.email ||
    (ticket.customFields?.requesterName as string | undefined) ||
    'Visitor';

  return (
    <li>
      <Link
        href={`/brands/${brandId}/chat?t=${ticket.id}`}
        scroll={false}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'block border-l-2 px-4 py-3 transition-colors',
          selected ? 'border-foreground bg-background' : 'border-transparent hover:bg-background/60',
        )}
      >
        <div className="flex items-center gap-2">
          {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
          <span className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium')}>{who}</span>
          <span className="ml-auto shrink-0">
            <WaitingBadge ticket={ticket} />
          </span>
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {typing ? <span className="italic text-foreground">typing…</span> : ticket.title}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          #{ticket.ticketNumber} · {formatTimeAgo(ticket.updatedAt)}
        </div>
      </Link>
    </li>
  );
}
