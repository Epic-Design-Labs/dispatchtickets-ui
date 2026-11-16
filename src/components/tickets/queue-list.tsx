'use client';

import Link from 'next/link';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandTile } from '@/components/brand-tile';
import { Pill } from '@/components/tickets/pill';
import { PriorityBadge } from '@/components/tickets/priority-badge';
import { StatusBadge } from '@/components/tickets/status-badge';
import { WaitingBadge } from '@/components/chat/waiting-badge';
import { isActive, dueStateOf, type QueueGroup, type QueueTone } from '@/components/tickets/queue-groups';
import { useQueueTicketAction } from '@/lib/hooks/use-queue-actions';
import { memberName } from '@/lib/member-name';
import { formatTicketNumber } from '@/lib/ticket-number';
import { cn, formatDateTime, formatTimeAgo } from '@/lib/utils';
import type { DashboardTicket, TeamMember } from '@/types';

/**
 * A queue as a list of rows in named groups, rather than a table.
 *
 * The table next door is the better tool for scanning three hundred tickets
 * and sorting them by a column; this is the better tool for working the top of
 * the queue, where what matters is which handful is late and what you can
 * close without opening it. Both stay, and the page remembers which one you
 * chose -- the mock offers the same two, and it is right to.
 */

const TONE_DOT: Record<QueueTone, string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  muted: 'bg-border-strong',
  success: 'bg-success',
};

export function QueueList({
  groups,
  teamMembers,
  memberId,
  view,
  emptyMessage,
}: {
  groups: QueueGroup[];
  teamMembers?: TeamMember[];
  /** The signed-in member, for "Take it". Absent on legacy-auth sessions. */
  memberId?: string;
  view: 'all' | 'mine' | 'unassigned';
  emptyMessage: string;
}) {
  const action = useQueueTicketAction();

  if (groups.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-10 text-center shadow-sm">
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="mb-2 flex items-center gap-2 px-1">
            {group.brand ? (
              <BrandTile name={group.brand.name} iconUrl={group.brand.iconUrl} size="sm" />
            ) : (
              <span
                className={cn('h-2 w-2 shrink-0 rounded-full', TONE_DOT[group.tone])}
                aria-hidden="true"
              />
            )}
            <span className="text-sm font-semibold">{group.title}</span>
            <span className="text-subtle text-sm tabular-nums">{group.items.length}</span>
            {group.hint && (
              <span className="text-subtle hidden text-xs sm:inline">· {group.hint}</span>
            )}
          </h3>
          <ul className="bg-card divide-y overflow-hidden rounded-xl border shadow-sm">
            {group.items.map((ticket) => (
              <QueueRow
                key={ticket.id}
                ticket={ticket}
                teamMembers={teamMembers}
                memberId={memberId}
                view={view}
                onAction={action.mutateAsync}
                busy={action.isPending}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

type ActionRunner = ReturnType<typeof useQueueTicketAction>['mutateAsync'];

function QueueRow({
  ticket,
  teamMembers,
  memberId,
  view,
  onAction,
  busy,
}: {
  ticket: DashboardTicket;
  teamMembers?: TeamMember[];
  memberId?: string;
  view: 'all' | 'mine' | 'unassigned';
  onAction: ActionRunner;
  busy: boolean;
}) {
  const open = isActive(ticket);
  const due = dueStateOf(ticket);
  const assignee = ticket.assigneeId ? memberName(ticket.assigneeId, teamMembers) : null;
  const contact = ticket.customer?.name || ticket.customer?.email;
  const number = formatTicketNumber(ticket.brand?.ticketPrefix, ticket.ticketNumber);

  const setStatus = async (status: 'resolved' | 'open', said: string) => {
    try {
      await onAction({ brandId: ticket.brandId, ticketId: ticket.id, data: { status } });
      toast.success(`${said} ${number}`);
    } catch {
      toast.error(`Failed to ${said.toLowerCase()} ${number}`);
    }
  };

  /**
   * Take it, but only if nobody else has.
   *
   * The same conditional UPDATE the chat pane claims with: the Unassigned
   * queue is the other place two agents reach for one ticket at the same
   * moment, and here they are both looking at a list that is up to a minute
   * stale, so the loser has to be told rather than silently overwrite.
   */
  const claim = async () => {
    if (!memberId) return;
    try {
      await onAction({
        brandId: ticket.brandId,
        ticketId: ticket.id,
        data: { assigneeId: memberId, ifUnassigned: true },
      });
      toast.success(`You have ${number}`);
    } catch (err) {
      const held =
        isAxiosError(err) && err.response?.status === 409
          ? (err.response?.data?.assigneeId as string | undefined)
          : undefined;
      if (held) {
        toast.error(`${memberName(held, teamMembers) ?? 'Someone else'} got there first`);
        return;
      }
      toast.error('Failed to assign');
    }
  };

  return (
    <li className="hover:bg-surface-muted relative flex items-center gap-3 px-4 py-3 transition-colors">
      {/* The whole row opens the ticket, but a row also carries buttons, and a
          button inside an anchor is neither valid nor keyboard-navigable. So
          the link is a layer underneath: the text above it ignores the mouse,
          and only the actions take it back. */}
      <Link
        href={`/brands/${ticket.brandId}/tickets/${ticket.id}`}
        className="absolute inset-0 rounded-none focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none"
      >
        <span className="sr-only">
          {ticket.title} · {number}
        </span>
      </Link>

      <div className="pointer-events-none flex min-w-0 flex-1 items-center gap-3">
        <BrandTile name={ticket.brand?.name ?? ''} iconUrl={ticket.brand?.iconUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{ticket.title}</span>
            <WaitingBadge ticket={ticket} />
          </div>
          <div className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
            <span className="min-w-0 truncate">
              {contact ?? 'No contact'} · {number} · {ticket.brand?.name}
              {/* Who holds it only earns room where it is not already the
                  answer to the whole page: in My tickets that is me, and in
                  Unassigned it is nobody. */}
              {view === 'all' && assignee ? ` · ${assignee}` : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none hidden shrink-0 items-center gap-1.5 md:flex">
        {ticket.priority && ticket.priority !== 'normal' && (
          <PriorityBadge priority={ticket.priority as 'low' | 'medium' | 'high' | 'urgent'} />
        )}
        {/* Inside "Needs a reply" every row is open, so the status chip would
            repeat the heading. It shows where it is news: pending, a custom
            status, or a ticket that is already done. */}
        {ticket.status && String(ticket.status) !== 'open' && (
          <StatusBadge status={ticket.status} statusRef={ticket.statusRef} />
        )}
        {due === 'over' && (
          <Pill dot={false} className="bg-danger-soft text-danger">
            Overdue
          </Pill>
        )}
        {due === 'today' && (
          <Pill dot={false} className="bg-warning-soft text-warning-foreground">
            Due today
          </Pill>
        )}
      </div>

      <span
        className="text-subtle pointer-events-none hidden w-20 shrink-0 text-right text-xs sm:block"
        title={`Last activity ${formatDateTime(ticket.updatedAt)}`}
      >
        {formatTimeAgo(ticket.updatedAt)}
      </span>

      <div className="relative flex shrink-0 items-center gap-1.5">
        {open ? (
          <>
            {view === 'unassigned' && memberId && (
              <Button variant="outline" size="sm" onClick={claim} disabled={busy}>
                Take it
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setStatus('resolved', 'Resolved')}
              disabled={busy}
              title="Resolve"
              aria-label={`Resolve ${ticket.title}`}
            >
              <Check className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setStatus('open', 'Reopened')} disabled={busy}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reopen
          </Button>
        )}
      </div>
    </li>
  );
}
