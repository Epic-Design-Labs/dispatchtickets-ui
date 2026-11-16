import type { DashboardTicket } from '@/types';

/**
 * How a queue is cut into sections.
 *
 * Pure, and separate from the list that draws it, because every rule here is
 * a claim about tickets that has to be checkable without a browser: which
 * ones are overdue, what "needs a reply" means, and what order a group is
 * worked in.
 */

/** Statuses where nobody is waiting on anybody. Mirrors the API's own list. */
const INACTIVE = ['resolved', 'closed', 'spam'];

export function isActive(ticket: Pick<DashboardTicket, 'status'>): boolean {
  return !INACTIVE.includes(String(ticket.status));
}

export type DueState = 'over' | 'today' | 'later' | null;

/**
 * Where a ticket sits against its due date.
 *
 * `dueAt` ALONE, which is narrower than it looks: the API fills it on create
 * when the brand has SLA enabled (tickets.service.ts computeSlaDueDate), so
 * brands without SLA have none and these groups simply never appear for them.
 *
 * `awaitingReplyLevel` is deliberately not read here, though it looks like the
 * same fact. Its thresholds are declared for `chat` and nothing else
 * (reply-state.ts AWAITING_REPLY_THRESHOLDS, "email already has SLA due
 * dates"), so a level of 2 only ever means a chat -- and chats have their own
 * tab. Grouping email tickets by it would put every one of them in "Needs a
 * reply" while claiming the escalation had been checked.
 */
export function dueStateOf(ticket: DashboardTicket, now: number = Date.now()): DueState {
  if (!isActive(ticket) || !ticket.dueAt) return null;
  const due = new Date(ticket.dueAt).getTime();
  if (Number.isNaN(due)) return null;
  if (due < now) return 'over';
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return due <= endOfDay.getTime() ? 'today' : 'later';
}

export type QueueTone = 'danger' | 'warning' | 'info' | 'muted' | 'success';

export interface QueueGroup {
  key: string;
  title: string;
  /** One line under the heading saying what put a ticket in this group. */
  hint?: string;
  tone: QueueTone;
  /** Set on brand groups, so the heading can carry the brand's tile. */
  brand?: { name: string; iconUrl?: string };
  items: DashboardTicket[];
}

const PRIORITY_RANK: Record<string, number> = {
  urgent: 5,
  high: 4,
  medium: 3,
  normal: 2,
  low: 1,
};

/**
 * Queue order within a group: loudest first, then whoever has waited longest.
 *
 * Only applied when the agent has no explicit sort of their own. A column they
 * clicked in the table is a decision, and switching to the grouped view should
 * not quietly overrule it -- so that case keeps the order the API sent.
 */
function byUrgencyThenAge(a: DashboardTicket, b: DashboardTicket): number {
  const rank =
    (PRIORITY_RANK[String(b.priority)] ?? 0) - (PRIORITY_RANK[String(a.priority)] ?? 0);
  if (rank !== 0) return rank;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export type QueueGrouping = 'urgency' | 'brand';

export interface QueueGroupOptions {
  by: QueueGrouping;
  /** Which queue this is; only changes what the open group is called. */
  view: 'all' | 'mine' | 'unassigned';
  /** False when a sort column is active -- see byUrgencyThenAge. */
  reorder?: boolean;
  now?: number;
}

/**
 * Cut a queue into its sections.
 *
 * Resolved and closed tickets always come back as their own final group
 * rather than being dropped, because the status tabs above this list can ask
 * for exactly those. A second control to reveal them would be a control that
 * can disagree with the tabs.
 */
export function groupQueue(
  tickets: DashboardTicket[],
  { by, view, reorder = true, now = Date.now() }: QueueGroupOptions,
): QueueGroup[] {
  const order = (items: DashboardTicket[]) => (reorder ? [...items].sort(byUrgencyThenAge) : items);
  const active = tickets.filter(isActive);
  const done = tickets.filter((t) => !isActive(t));

  const groups: QueueGroup[] =
    by === 'brand' ? brandGroups(active, order) : urgencyGroups(active, view, order, now);

  if (done.length > 0) {
    groups.push({
      key: 'done',
      title: 'Resolved and closed',
      tone: 'success',
      items: order(done),
    });
  }

  return groups.filter((group) => group.items.length > 0);
}

function urgencyGroups(
  active: DashboardTicket[],
  view: QueueGroupOptions['view'],
  order: (items: DashboardTicket[]) => DashboardTicket[],
  now: number,
): QueueGroup[] {
  const over: DashboardTicket[] = [];
  const today: DashboardTicket[] = [];
  const rest: DashboardTicket[] = [];

  for (const ticket of active) {
    const due = dueStateOf(ticket, now);
    if (due === 'over') over.push(ticket);
    else if (due === 'today') today.push(ticket);
    else rest.push(ticket);
  }

  return [
    {
      key: 'over',
      title: 'Overdue',
      hint: 'Past the due date the brand’s response target set',
      tone: 'danger' as QueueTone,
      items: order(over),
    },
    {
      key: 'today',
      title: 'Due today',
      hint: 'Due before the end of today',
      tone: 'warning' as QueueTone,
      items: order(today),
    },
    {
      key: 'open',
      // On the unassigned queue "needs a reply" would be telling the agent to
      // do something they have not taken on yet.
      title: view === 'unassigned' ? 'Waiting for someone' : 'Needs a reply',
      hint: 'Open, waiting on your team',
      tone: 'info' as QueueTone,
      items: order(rest.filter((t) => String(t.status) === 'open')),
    },
    {
      key: 'pending',
      title: 'Waiting on customer',
      hint: 'Pending until they write back',
      tone: 'muted' as QueueTone,
      items: order(rest.filter((t) => String(t.status) === 'pending')),
    },
    {
      // Custom statuses are neither open nor pending and are not inactive, so
      // without this they would vanish from the grouped view entirely.
      key: 'other',
      title: 'In progress',
      hint: 'On one of this brand’s own statuses',
      tone: 'muted' as QueueTone,
      items: order(rest.filter((t) => !['open', 'pending'].includes(String(t.status)))),
    },
  ];
}

function brandGroups(
  active: DashboardTicket[],
  order: (items: DashboardTicket[]) => DashboardTicket[],
): QueueGroup[] {
  const byBrand = new Map<string, DashboardTicket[]>();
  for (const ticket of active) {
    const list = byBrand.get(ticket.brandId);
    if (list) list.push(ticket);
    else byBrand.set(ticket.brandId, [ticket]);
  }

  return [...byBrand.entries()]
    .map(([brandId, items]) => ({
      key: brandId,
      title: items[0].brand?.name ?? 'Unknown brand',
      tone: 'muted' as QueueTone,
      brand: { name: items[0].brand?.name ?? 'Unknown brand', iconUrl: items[0].brand?.iconUrl },
      items: order(items),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
