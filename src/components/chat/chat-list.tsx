'use client';

import Link from 'next/link';
import { cn, formatTimeAgo } from '@/lib/utils';
import { WaitingBadge } from '@/components/chat/waiting-badge';
import { useUnreadChats, useVisitorTyping } from '@/lib/live/chat-activity';
import { BrandTile } from '@/components/brand-tile';
import type { Ticket, BrandInfo } from '@/types';

/** The cross-brand endpoint attaches `brand`; the per-brand one does not. */
function brandOf(ticket: Ticket): BrandInfo | undefined {
  return (ticket as Ticket & { brand?: BrandInfo }).brand;
}

/** Where a row points. Each ticket carries its own brandId, so the per-brand
 *  and cross-brand pages differ only in the URL they build. */
export type ChatHref = (ticket: Ticket) => string;

const brandChatHref: ChatHref = (t) => `/brands/${t.brandId}/chat?t=${t.id}`;

/**
 * The Chat tab's left column. "Waiting" is every chat whose visitor spoke
 * last, oldest first (the API's sort); "Replied" is the rest of the open chats.
 */
export function ChatList({
  tickets,
  selectedId,
  hrefFor = brandChatHref,
  showBrand = false,
}: {
  tickets: Ticket[];
  selectedId: string | null;
  hrefFor?: ChatHref;
  /** The cross-brand page labels each row, since "who" is not enough there. */
  showBrand?: boolean;
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
      <p className="px-4 py-2 text-xs text-muted-foreground">
        <kbd className="font-mono">Alt ↑↓</kbd> to switch chats · <kbd className="font-mono">#</kbd> for saved replies
      </p>
      <Section title="Waiting" count={waiting.length}>
        {waiting.map((t) => (
          <ChatRow key={t.id} ticket={t} href={hrefFor(t)} selected={t.id === selectedId} unread={unread.has(t.id)} showBrand={showBrand} />
        ))}
      </Section>
      <Section title="Replied" count={replied.length}>
        {replied.map((t) => (
          <ChatRow key={t.id} ticket={t} href={hrefFor(t)} selected={t.id === selectedId} unread={unread.has(t.id)} showBrand={showBrand} />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="sticky top-0 z-10 bg-canvas px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} <span className="tabular-nums">({count})</span>
      </h3>
      {count === 0 ? <p className="px-4 pb-3 text-xs text-muted-foreground">None</p> : <ul>{children}</ul>}
    </section>
  );
}

function ChatRow({
  ticket,
  href,
  selected,
  unread,
  showBrand,
}: {
  ticket: Ticket;
  href: string;
  selected: boolean;
  unread: boolean;
  showBrand: boolean;
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
        href={href}
        scroll={false}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'block border-l-2 px-4 py-3 transition-colors',
          selected ? 'border-foreground bg-background' : 'border-transparent hover:bg-background/60',
        )}
      >
        <div className="flex items-center gap-2">
          {unread && <span className="bg-info h-2 w-2 shrink-0 rounded-full" aria-label="Unread" />}
          <span className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium')}>{who}</span>
          <span className="ml-auto shrink-0">
            <WaitingBadge ticket={ticket} />
          </span>
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {typing ? <span className="italic text-foreground">typing…</span> : ticket.title}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {showBrand && brandOf(ticket) && (
            <>
              <BrandTile name={brandOf(ticket)!.name} iconUrl={brandOf(ticket)!.iconUrl} size="sm" />
              <span className="max-w-[9rem] truncate">{brandOf(ticket)!.name}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>#{ticket.ticketNumber} · {formatTimeAgo(ticket.updatedAt)}</span>
        </div>
      </Link>
    </li>
  );
}
