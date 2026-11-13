'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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

/** Who the row is about: the same fallback chain the row itself renders. */
function whoOf(ticket: Ticket): string {
  return (
    ticket.customer?.name ||
    ticket.customer?.email ||
    (ticket.customFields?.requesterName as string | undefined) ||
    'Visitor'
  );
}

/**
 * Filter the queue client-side.
 *
 * Client-side because the whole open-chat queue is already in memory -- it is
 * the list the agent is looking at -- so a round trip would only add latency
 * to each keystroke and a loading state to a list that is already on screen.
 * This is not the ticket search; it narrows what is in front of you.
 */
function matches(ticket: Ticket, needle: string): boolean {
  const haystack = [
    whoOf(ticket),
    ticket.customer?.email,
    ticket.title,
    `#${ticket.ticketNumber}`,
    brandOf(ticket)?.name,
  ];
  return haystack.some((value) => value?.toLowerCase().includes(needle));
}

/**
 * The Chat tab's left column. "Waiting" is every chat whose visitor spoke
 * last, oldest first (the API's sort); "Replied" is the rest of the open chats.
 *
 * Both groups stay on screen rather than becoming tabs: an agent working the
 * queue needs to see that nobody is waiting, and a tab that has to be clicked
 * to prove it is empty does not say that.
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
  const router = useRouter();
  const unread = useUnreadChats();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? tickets.filter((t) => matches(t, needle)) : tickets;
  }, [tickets, query]);

  const waiting = visible.filter((t) => t.awaitingReplySince);
  const replied = visible.filter((t) => !t.awaitingReplySince);

  // Alt+Up / Alt+Down move through the list. Not J/K: the reply box keeps
  // focus here, so plain letters belong to the reply.
  //
  // It lives here, not on the two pages that render this list, because the
  // order it steps through is the order drawn below -- including whatever the
  // search has narrowed it to. Kept on the page, every filter added here
  // would silently desync the keyboard from the screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      const ordered = [
        ...visible.filter((t) => t.awaitingReplySince),
        ...visible.filter((t) => !t.awaitingReplySince),
      ];
      if (ordered.length === 0) return;
      e.preventDefault();
      const at = ordered.findIndex((t) => t.id === selectedId);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next = ordered[(at + step + ordered.length) % ordered.length] ?? ordered[0];
      router.replace(hrefFor(next), { scroll: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, selectedId, router, hrefFor]);

  if (tickets.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No open chats. New ones appear here as soon as a visitor writes in.
      </p>
    );
  }

  return (
    <div className="divide-y">
      <div className="sticky top-0 z-20 bg-canvas p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="h-9 pl-9"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          No chat matches &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <>
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
        </>
      )}

      <p className="px-4 py-2 text-xs text-muted-foreground">
        <kbd className="font-mono">Alt ↑↓</kbd> to switch chats · <kbd className="font-mono">#</kbd> for saved replies
      </p>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <h3 className="sticky top-[52px] z-10 bg-canvas px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
  const who = whoOf(ticket);

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
        {/* One line, never two. Everything left of "Unassigned" truncates:
            formatTimeAgo gives up on relative time after a week and returns a
            full date, and a chat that has been waiting sixteen days is exactly
            the row where that long string would otherwise push the flag onto a
            second line in a 20rem column. */}
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {showBrand && brandOf(ticket) && (
            <>
              <BrandTile name={brandOf(ticket)!.name} iconUrl={brandOf(ticket)!.iconUrl} size="sm" />
              <span className="min-w-0 max-w-[7rem] truncate">{brandOf(ticket)!.name}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="min-w-0 truncate">#{ticket.ticketNumber} · {formatTimeAgo(ticket.updatedAt)}</span>
          {/* Only the absence is worth a word. Naming the assignee would mean
              fetching the team on both pages that render this list; saying
              nobody has it yet needs only the id that is already here. */}
          {!ticket.assigneeId && <span className="ml-auto shrink-0">Unassigned</span>}
        </div>
      </Link>
    </li>
  );
}
