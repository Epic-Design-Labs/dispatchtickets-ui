'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PersonAvatar } from '@/components/person-avatar';
import { PRESENCE_LABELS, PresenceDot } from '@/components/presence/presence-dot';
import { RoleBadge } from './role-badge';
import { ROLE_HELP } from './invite-member-dialog';
import type { PresenceStatus } from '@/lib/api/presence';
import type { TeamMember } from '@/types';
import { cn, formatTimeAgo } from '@/lib/utils';

/** One row of the team table: a member or a pending invite, with its figures. */
export interface TeamRow {
  member: TeamMember;
  pending: boolean;
  /** Full name, or the email when there is none -- what the row is called. */
  name: string;
  presence: PresenceStatus;
  /** The member's status differs between brands; the row shows the most available. */
  mixedPresence: boolean;
  /** Tickets they resolved or closed in the window. */
  resolved: number;
  csatScore: number | null;
  csatCount: number;
}

interface TeamMemberTableProps {
  rows: TeamRow[];
  isLoading?: boolean;
  /** Longest bar in the Resolved column, so the bars compare people. */
  maxResolved: number;
  /** The signed-in member, marked "You". */
  currentMemberId?: string;
  canInvite: boolean;
  onResend: (member: TeamMember) => void;
  resendingId?: string | null;
  empty: { title: string; body: string };
}

function csatTone(score: number): string {
  if (score >= 80) return 'text-success-foreground';
  if (score >= 60) return 'text-warning-foreground';
  return 'text-danger';
}

function brandAccess(member: TeamMember): string {
  const assignment = member.brandAssignment;
  if (assignment?.allBrands || !assignment?.brandIds?.length) return 'All brands';
  const n = assignment.brandIds.length;
  return `${n} brand${n === 1 ? '' : 's'}`;
}

const COLUMNS = ['Member', 'Role', 'Brands', 'Availability', 'Resolved', 'Satisfaction', ''];

export function TeamMemberTable({
  rows,
  isLoading,
  maxResolved,
  currentMemberId,
  canInvite,
  onResend,
  resendingId,
  empty,
}: TeamMemberTableProps) {
  const router = useRouter();
  const open = (id: string) => router.push(`/team/${id}`);

  return (
    // The table keeps its columns on a phone and scrolls sideways inside the
    // card instead of crushing seven columns into a third of the width.
    <div className="bg-card overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs font-medium">
            {COLUMNS.map((label, i) => (
              <th
                key={label || i}
                scope="col"
                className={cn('px-4 py-2.5 font-medium', label === 'Satisfaction' && 'text-right')}
              >
                {label === 'Resolved' ? (
                  <>
                    Resolved <span className="font-normal opacity-70">30 days</span>
                  </>
                ) : (
                  label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                </td>
                {[16, 20, 20, 28, 20].map((w, j) => (
                  <td key={j} className="px-4 py-3">
                    <Skeleton className="h-4" style={{ width: w * 4 }} />
                  </td>
                ))}
                <td />
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-12 text-center">
                <p className="font-medium">{empty.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{empty.body}</p>
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const { member, pending } = row;
              const isMe = !pending && member.id === currentMemberId;
              return (
                <tr
                  key={member.id}
                  tabIndex={0}
                  aria-label={`Open ${row.name}`}
                  onClick={() => open(member.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') open(member.id);
                  }}
                  className="hover:bg-surface-muted focus-visible:outline-brand cursor-pointer border-b transition-colors last:border-0 focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {pending ? (
                        <span className="bg-secondary text-muted-foreground grid h-8 w-8 shrink-0 place-items-center rounded-full">
                          <UserRound className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="relative shrink-0">
                          <PersonAvatar name={row.name} imageUrl={member.avatarUrl} />
                          <PresenceDot
                            status={row.presence}
                            className="ring-card absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 ring-2"
                          />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-medium">
                          <span className="truncate">{row.name}</span>
                          {isMe && (
                            <span className="bg-secondary text-muted-foreground rounded-full px-2 py-px text-[11px] font-medium">
                              You
                            </span>
                          )}
                        </div>
                        {/* The second line is the email -- unless the row is
                            already called by it, when it would just repeat. */}
                        {(pending || row.name !== member.email) && (
                          <div className="text-muted-foreground truncate text-xs">
                            {pending
                              ? member.sentAt
                                ? `Invite sent ${formatTimeAgo(member.sentAt)}`
                                : 'Invite sent'
                              : member.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span title={ROLE_HELP[member.role]}>
                      <RoleBadge role={member.role} />
                    </span>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{brandAccess(member)}</td>
                  <td className="px-4 py-3">
                    {pending ? (
                      <span className="bg-warning-soft text-warning-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                        Invite pending
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5"
                        title={row.mixedPresence ? 'Status differs by brand; showing the most available' : undefined}
                      >
                        <PresenceDot status={row.presence} />
                        <span className={cn(row.presence === 'offline' && 'text-muted-foreground')}>
                          {PRESENCE_LABELS[row.presence]}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {pending ? (
                      <span className="text-muted-foreground">–</span>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <span className="bg-secondary h-1.5 w-24 overflow-hidden rounded-full">
                          <span
                            className="bg-brand block h-full rounded-full"
                            style={{ width: `${Math.round((row.resolved / Math.max(1, maxResolved)) * 100)}%` }}
                          />
                        </span>
                        <span className="font-semibold tabular-nums">{row.resolved}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {pending ? null : row.csatScore === null || row.csatCount === 0 ? (
                      <span className="text-muted-foreground">No ratings yet</span>
                    ) : (
                      <>
                        <span className={cn('font-semibold tabular-nums', csatTone(row.csatScore))}>
                          {Math.round(row.csatScore)}%
                        </span>{' '}
                        <span className="text-muted-foreground text-xs">
                          {row.csatCount} rating{row.csatCount === 1 ? '' : 's'}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {pending && canInvite ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resendingId === member.id}
                        onClick={(e) => {
                          // The row opens the invite; this button only resends it.
                          e.stopPropagation();
                          onResend(member);
                        }}
                      >
                        {resendingId === member.id ? 'Sending...' : 'Resend'}
                      </Button>
                    ) : (
                      <ChevronRight className="text-muted-foreground ml-auto h-4 w-4" />
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
