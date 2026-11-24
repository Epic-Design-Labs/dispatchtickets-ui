'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Radio, Search, ShieldCheck, Star, Users, MailPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InviteMemberDialog, TeamMemberTable } from '@/components/team';
import type { TeamRow } from '@/components/team/team-member-table';
import { MetricChip, StatusTabs, type StatusTabDef } from '@/components/tickets/status-tabs';
import {
  useOrganization,
  useResendInvite,
  useTeamMembers,
  useTeamMetrics,
} from '@/lib/hooks';
import { useTeamPresence } from '@/lib/hooks/use-presence';
import type { PresenceStatus } from '@/lib/api/presence';
import { useAuth } from '@/providers';
import type { OrgRole, TeamMember } from '@/types';
import { toast } from 'sonner';

type Filter = 'all' | 'online' | 'admins' | 'invited';
type Sort = 'resolved' | 'name';

const TEAM_TABS: StatusTabDef[] = [
  { key: 'all', label: 'Everyone', icon: Users, tone: 'bg-secondary text-muted-foreground' },
  { key: 'online', label: 'Online now', icon: Radio, tone: 'bg-success-soft text-success-foreground' },
  { key: 'admins', label: 'Owners & admins', icon: ShieldCheck, tone: 'bg-brand-soft text-brand' },
  { key: 'invited', label: 'Invited', icon: MailPlus, tone: 'bg-warning-soft text-warning-foreground' },
];

/**
 * The window the Resolved and Satisfaction figures cover. It was all-time and
 * unlabelled; the column now says "30 days" and means it. Computed once per
 * visit, so the query key holds still while the page is open.
 */
function last30Days() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function displayName(member: TeamMember): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  return name || member.email;
}

const ONLINE: PresenceStatus[] = ['available', 'busy', 'away'];

export default function TeamPage() {
  const { session } = useAuth();
  const { data, isLoading } = useTeamMembers();
  const { data: presence } = useTeamPresence();
  const [range] = useState(last30Days);
  const { data: metrics, isLoading: metricsLoading } = useTeamMetrics(range);
  const { data: org } = useOrganization();
  const resendInvite = useResendInvite();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('resolved');
  const [resendingId, setResendingId] = useState<string | null>(null);

  const role = (session?.orgRole as OrgRole) || 'member';
  const canInvite = role === 'owner' || role === 'admin';

  // Every member and invite, with the figures joined on by member id. Built
  // from the member list rather than from the metrics: a resolver's name only
  // ever came from CSAT feedback, so the old performance table called anyone
  // without ratings "Unknown". Here every row already has a name.
  const rows: TeamRow[] = useMemo(() => {
    const presenceById = new Map((presence ?? []).map((p) => [p.memberId, p]));
    const metricsById = new Map((metrics?.members ?? []).map((m) => [m.memberId, m]));
    const toRow = (member: TeamMember, pending: boolean): TeamRow => {
      const p = presenceById.get(member.id);
      const status = p?.status ?? 'offline';
      const m = metricsById.get(member.id);
      return {
        member,
        pending,
        name: pending ? member.email : displayName(member),
        presence: status,
        mixedPresence: !!p?.brands.some((b) => b.status !== status),
        // Resolved or closed: the API records the resolver on whichever came
        // first, and both are work this person finished.
        resolved: (m?.ticketsResolved ?? 0) + (m?.ticketsClosed ?? 0),
        csatScore: m?.csatScore ?? null,
        csatCount: m?.csatCount ?? 0,
      };
    };
    return [
      ...(data?.members ?? []).map((m) => toRow(m, false)),
      ...(data?.invites ?? []).map((m) => toRow(m, true)),
    ];
  }, [data, presence, metrics]);

  const matches = (row: TeamRow, f: Filter) =>
    f === 'all' ||
    (f === 'online' && !row.pending && ONLINE.includes(row.presence)) ||
    (f === 'admins' && row.member.role !== 'member') ||
    (f === 'invited' && row.pending);

  const counts = Object.fromEntries(
    TEAM_TABS.map((t) => [t.key, rows.filter((r) => matches(r, t.key as Filter)).length])
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => matches(r, filter))
      .filter((r) => !q || `${r.name} ${r.member.email}`.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === 'name'
          ? a.name.localeCompare(b.name)
          : b.resolved - a.resolved || a.name.localeCompare(b.name)
      );
  }, [rows, filter, query, sort]);

  const people = rows.filter((r) => !r.pending);
  const maxResolved = Math.max(1, ...people.map((r) => r.resolved));
  const totalResolved = people.reduce((sum, r) => sum + r.resolved, 0);
  const ratings = people.reduce((sum, r) => sum + r.csatCount, 0);
  // Weighted by ratings, so one member's single 5-star review does not count
  // as much as another's hundred.
  const satisfaction = ratings
    ? Math.round(people.reduce((sum, r) => sum + (r.csatScore ?? 0) * r.csatCount, 0) / ratings)
    : null;

  const handleResend = async (member: TeamMember) => {
    setResendingId(member.id);
    try {
      await resendInvite.mutateAsync(member.id);
      toast.success(`Invite resent to ${member.email}`);
    } catch {
      toast.error('Failed to resend the invite');
    } finally {
      setResendingId(null);
    }
  };

  const empty = query.trim()
    ? { title: `No one matches "${query.trim()}"`, body: 'Try a name or an email address.' }
    : filter === 'invited'
      ? { title: 'No pending invites', body: 'Invite teammates and they show here until they join.' }
      : filter === 'online'
        ? { title: 'No one is online', body: 'Members show here while they are available, busy or away.' }
        : { title: 'No one here', body: 'Try a different filter.' };

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team</h1>
            {isLoading ? (
              <Skeleton className="mt-1 h-4 w-48" />
            ) : (
              <p className="text-muted-foreground">
                {`${people.length} ${people.length === 1 ? 'person' : 'people'}${org?.name ? ` in ${org.name}` : ''}`}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <MetricChip icon={Radio} value={isLoading ? '–' : String(counts.online)} label="online now" />
            <MetricChip
              icon={CheckCircle2}
              value={metricsLoading ? '–' : String(totalResolved)}
              label="resolved, last 30 days"
            />
            {satisfaction !== null && (
              <MetricChip icon={Star} value={`${satisfaction}%`} label="satisfaction" />
            )}
          </div>
        </div>
        {canInvite && <InviteMemberDialog onInvited={() => setFilter('invited')} />}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StatusTabs
          tabs={TEAM_TABS}
          defaultKey="all"
          value={filter}
          onSelect={(key) => setFilter(key as Filter)}
          counts={counts}
          loading={isLoading}
          ariaLabel="Filter team"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              aria-label="Search team"
              className="w-[240px] pl-8"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-[150px]" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resolved">Most resolved</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <TeamMemberTable
        rows={visible}
        isLoading={isLoading}
        maxResolved={maxResolved}
        currentMemberId={session?.memberId}
        canInvite={canInvite}
        onResend={handleResend}
        resendingId={resendingId}
        empty={empty}
      />

    </div>
  );
}
