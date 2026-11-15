'use client';

import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { PersonAvatar } from '@/components/person-avatar';
import { Pill } from '@/components/tickets/pill';
import { authorAvatarUrl, authorLabel, isInternalNote } from '@/components/comments/comment-author';
import type { Comment, Contact, TeamMember } from '@/types';

/** Consecutive messages from the same person collapse into one group. */
const GROUP_WINDOW_MS = 10 * 60 * 1000;

/**
 * A chat, read as a chat: the visitor on the left, us on the right, grouped
 * into runs and broken up by the day.
 *
 * Separate from CommentThread rather than a variant of it. The ticket page
 * reads as a record -- every entry the same width, newest first, stamped with
 * a full date -- and a chat reads as a conversation. Sharing one component
 * meant one of the two was always wrong. They share the parts that must not
 * diverge instead: comment-author.ts resolves who wrote each message, and
 * MarkdownContent renders every body, so a reply looks the same in both.
 *
 * Our replies keep the soft brand fill rather than the solid one a chat
 * usually has: these bodies are markdown, and links, code and quotes inside a
 * saturated bubble lose their contrast. Side, corner and grouping carry the
 * "this one is ours" signal, which is what the fill was for.
 */
export function ChatThread({
  comments,
  isLoading,
  brandId,
  customer,
  teamMembers = [],
}: {
  comments: Comment[];
  isLoading?: boolean;
  brandId?: string;
  customer?: Contact;
  teamMembers?: TeamMember[];
}) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn('flex max-w-[78%] gap-2.5', i === 1 && 'ml-auto flex-row-reverse')}>
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <Skeleton className="h-14 w-56 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <span className="bg-brand-soft text-brand grid h-11 w-11 place-items-center rounded-xl">
          <MessageSquare className="h-5 w-5" />
        </span>
        <p className="text-muted-foreground text-sm">No messages yet</p>
      </div>
    );
  }

  const rows = layout(comments, customer);

  return (
    <div>
      {rows.map((row) =>
        row.kind === 'system' ? (
          <div key={row.comment.id}>
            {row.newDay && <DaySeparator date={row.comment.createdAt} />}
            <p className="text-subtle my-4 text-center text-xs">
              <span className="bg-canvas rounded-full border px-2.5 py-1">{row.comment.body}</span>
            </p>
          </div>
        ) : (
          <div key={row.comment.id}>
            {row.newDay && <DaySeparator date={row.comment.createdAt} />}
            <div
              className={cn(
                'flex max-w-[78%] gap-2.5',
                row.firstOfGroup ? 'mt-4' : 'mt-1',
                row.mine && 'ml-auto flex-row-reverse',
              )}
            >
              {/* The slot is held even when the avatar is not drawn, so a
                  group's bubbles line up under its first one. */}
              <div className="w-7 shrink-0">
                {row.firstOfGroup && (
                  <PersonAvatar
                    name={row.label}
                    imageUrl={authorAvatarUrl(row.comment, { customer, teamMembers })}
                    size="sm"
                    className="h-7 w-7"
                  />
                )}
              </div>
              <div className={cn('min-w-0', row.mine && 'text-right')}>
                {row.firstOfGroup && (
                  <div className={cn('mb-1 flex flex-wrap items-center gap-2 text-xs', row.mine && 'justify-end')}>
                    <span className="text-sm font-semibold">{row.label}</span>
                    {row.comment.metadata?.isTicketBody === true && (
                      <Pill dot={false} className="bg-info-soft text-info">
                        {row.comment.metadata?.isConvertedDescription === true
                          ? 'Turned into ticket'
                          : 'Original request'}
                      </Pill>
                    )}
                    {row.comment.metadata?.chatOpeningMessage === true && (
                      <Pill dot={false} className="bg-info-soft text-info">
                        Chat started
                      </Pill>
                    )}
                    {row.note && (
                      <Pill dot={false} className="bg-warning-soft text-warning-foreground">
                        Internal note
                      </Pill>
                    )}
                    <time
                      className="text-subtle"
                      dateTime={row.comment.createdAt}
                      title={fullStamp(row.comment.createdAt)}
                    >
                      {clock(row.comment.createdAt)}
                    </time>
                  </div>
                )}
                <MarkdownContent
                  content={row.comment.body}
                  brandId={brandId}
                  className={cn(
                    'inline-block max-w-full px-3 py-2 text-left text-sm',
                    row.note
                      ? 'bg-warning-soft border-warning/40 border border-dashed'
                      : row.mine
                        ? 'bg-brand-soft border-brand-softer border'
                        : 'bg-canvas border',
                    // The square corner points at whoever is speaking, and only
                    // on the first of a run -- a group reads as one utterance.
                    row.firstOfGroup
                      ? row.mine
                        ? 'rounded-xl rounded-tr-sm'
                        : 'rounded-xl rounded-tl-sm'
                      : 'rounded-xl',
                  )}
                />
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

type Row =
  | { kind: 'system'; comment: Comment; newDay: boolean }
  | { kind: 'message'; comment: Comment; newDay: boolean; firstOfGroup: boolean; mine: boolean; note: boolean; label: string };

/**
 * Decide, in one pass, where the days break and where the groups start.
 *
 * Worked out before anything renders rather than carried along in a variable
 * while mapping: a row's appearance depends on the row above it, and a render
 * pass is not a safe place to keep that kind of running state.
 */
function layout(comments: Comment[], customer?: Contact): Row[] {
  let previous: { label: string; mine: boolean; note: boolean; at: number; day: string } | null = null;

  return comments.map((comment) => {
    const day = dayKey(comment.createdAt);
    const newDay = previous?.day !== day;

    if (comment.authorType === 'SYSTEM') {
      // A system line ends whatever group it interrupts.
      previous = null;
      return { kind: 'system', comment, newDay };
    }

    const note = isInternalNote(comment);
    const label = authorLabel(comment, { customer });
    const at = new Date(comment.createdAt).getTime();
    // Ours sits on the right: both an agent reply and a note nobody outside
    // the team will ever see.
    const mine = comment.authorType !== 'CUSTOMER';
    const firstOfGroup =
      newDay ||
      !previous ||
      previous.mine !== mine ||
      previous.note !== note ||
      previous.label !== label ||
      at - previous.at > GROUP_WINDOW_MS;

    previous = { label, mine, note, at, day };
    return { kind: 'message', comment, newDay, firstOfGroup, mine, note, label };
  });
}

/** Groups and separators compare days in the reader's own timezone. */
function dayKey(date: string): string {
  return new Date(date).toDateString();
}

function DaySeparator({ date }: { date: string }) {
  return (
    <div className="text-subtle my-4 flex items-center gap-3 text-xs first:mt-0">
      <span className="h-px flex-1 bg-border" />
      {dayLabel(date)}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function dayLabel(date: string): string {
  const then = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (then.toDateString() === today.toDateString()) return 'Today';
  if (then.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    // A chat from another year is rare and worth saying out loud.
    ...(then.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

/** The time alone: the day is already written across the separator above. */
function clock(date: string): string {
  return new Date(date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function fullStamp(date: string): string {
  return new Date(date).toLocaleString();
}
