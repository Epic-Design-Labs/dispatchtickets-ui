'use client';

import { useMemo, useState } from 'react';
import { Clock, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRecurringTicket, useUpdateRecurringTicket } from '@/lib/hooks';
import { memberName } from '@/lib/member-name';
import type { Category, RecurringTicket, RecurringTicketSchedule, TeamMember } from '@/types';
import {
  MONTHS,
  REPEATS_OPTIONS,
  type Repeats,
  SAFE_MAX_DAY,
  WEEKDAYS,
  allTimeZones,
  browserTimeZone,
  describeSchedule,
  firstRunDate,
  ordinal,
  repeatsOf,
} from './schedule';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const NONE = '__none';

interface Draft {
  title: string;
  body: string;
  repeats: Repeats;
  dayOfWeek: number;
  dayOfMonth: number;
  month: number;
  timeOfDay: string;
  timezone: string;
  priority: string;
  assigneeId: string;
  categoryId: string;
}

function draftOf(rt: RecurringTicket | null, myMemberId?: string): Draft {
  if (!rt) {
    return {
      title: '',
      body: '',
      repeats: 'weekly',
      dayOfWeek: 1,
      dayOfMonth: 1,
      month: 1,
      timeOfDay: '09:00',
      timezone: browserTimeZone(),
      priority: 'normal',
      assigneeId: myMemberId ?? NONE,
      categoryId: NONE,
    };
  }
  const s = rt.schedule;
  return {
    title: rt.title,
    body: rt.body ?? '',
    repeats: repeatsOf(s),
    dayOfWeek: s.dayOfWeek ?? 1,
    dayOfMonth: s.dayOfMonth ?? 1,
    month: s.month ?? 1,
    timeOfDay: s.timeOfDay,
    timezone: s.timezone || rt.timezone || browserTimeZone(),
    priority: rt.priority ?? 'normal',
    assigneeId: rt.assigneeId ?? NONE,
    categoryId: rt.categoryId ?? NONE,
  };
}

function scheduleOf(d: Draft, existing?: RecurringTicketSchedule): RecurringTicketSchedule {
  const base = { timeOfDay: d.timeOfDay || '09:00', timezone: d.timezone };
  switch (d.repeats) {
    case 'daily':
      return { ...base, frequency: 'daily', skipWeekends: false };
    case 'weekdays':
      return { ...base, frequency: 'daily', skipWeekends: true };
    default: {
      // A weekly/monthly/yearly schedule can carry skipWeekends from the API;
      // keep it rather than silently changing when it runs.
      const keep = existing && existing.frequency === d.repeats && existing.skipWeekends ? { skipWeekends: true } : {};
      if (d.repeats === 'weekly') return { ...base, ...keep, frequency: 'weekly', dayOfWeek: d.dayOfWeek };
      if (d.repeats === 'monthly') return { ...base, ...keep, frequency: 'monthly', dayOfMonth: d.dayOfMonth };
      return { ...base, ...keep, frequency: 'yearly', month: d.month, dayOfMonth: d.dayOfMonth };
    }
  }
}

function daysInMonth(month: number): number {
  return new Date(Date.UTC(2024, month, 0)).getUTCDate(); // leap year: Feb has 29
}

interface Props {
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create. */
  editing: RecurringTicket | null;
  members: TeamMember[];
  categories: Category[];
  myMemberId?: string;
}

export function RecurringTicketDialog(props: Props) {
  // Remount per open/target so the draft starts from the right values.
  if (!props.open) return <Dialog open={false} onOpenChange={props.onOpenChange} />;
  return <DialogBody key={props.editing?.id ?? 'new'} {...props} />;
}

function DialogBody({ brandId, open, onOpenChange, editing, members, categories, myMemberId }: Props) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(editing, myMemberId));
  const [titleError, setTitleError] = useState(false);
  const create = useCreateRecurringTicket(brandId);
  const update = useUpdateRecurringTicket(brandId);
  const saving = create.isPending || update.isPending;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const schedule = scheduleOf(draft, editing?.schedule);
  const first = firstRunDate(schedule);
  const zones = useMemo(() => allTimeZones(draft.timezone), [draft.timezone]);

  // Days on offer: 1-28, plus the existing day when an older schedule uses 29-31.
  const monthMax = draft.repeats === 'yearly' ? daysInMonth(draft.month) : SAFE_MAX_DAY;
  const dayChoices = Array.from({ length: monthMax }, (_, i) => i + 1);
  if (draft.repeats === 'monthly' && draft.dayOfMonth > SAFE_MAX_DAY) dayChoices.push(draft.dayOfMonth);
  const lateDay = draft.repeats === 'monthly' && draft.dayOfMonth > SAFE_MAX_DAY;

  const assignable = members.filter((m) => m.status === 'active');
  const assigneeMissing =
    draft.assigneeId !== NONE && !assignable.some((m) => m.id === draft.assigneeId);

  const save = async () => {
    const title = draft.title.trim();
    if (!title) {
      setTitleError(true);
      return;
    }
    const assigneeId = draft.assigneeId === NONE ? null : draft.assigneeId;
    const categoryId = draft.categoryId === NONE ? null : draft.categoryId;
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          data: {
            title,
            body: draft.body.trim(),
            priority: draft.priority,
            assigneeId,
            categoryId,
            schedule,
          },
        });
        toast.success('Schedule saved');
      } else {
        await create.mutateAsync({
          title,
          body: draft.body.trim() || undefined,
          priority: draft.priority,
          assigneeId: assigneeId ?? undefined,
          categoryId: categoryId ?? undefined,
          schedule,
        });
        toast.success(`Scheduled. ${describeSchedule(schedule)}.`);
      }
      onOpenChange(false);
    } catch {
      toast.error(editing ? 'Could not save the schedule' : 'Could not create the schedule');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="text-muted-foreground h-4 w-4" />
            {editing ? 'Edit recurring ticket' : 'New recurring ticket'}
          </DialogTitle>
          <DialogDescription>A new ticket is created automatically each time it repeats.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rt-title">Ticket title</Label>
            <Input
              id="rt-title"
              value={draft.title}
              aria-invalid={titleError || undefined}
              onChange={(e) => {
                set('title', e.target.value);
                if (titleError) setTitleError(false);
              }}
              placeholder="e.g. Monthly site health check"
            />
            {titleError ? (
              <p className="text-destructive text-xs">Add a title.</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                You can use {'{{date}}'}, {'{{month}}'} and {'{{count}}'} in the title.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rt-body">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea id="rt-body" rows={3} value={draft.body} onChange={(e) => set('body', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Repeats</Label>
              <Select value={draft.repeats} onValueChange={(v) => set('repeats', v as Repeats)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPEATS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {draft.repeats === 'weekly' && (
              <div className="space-y-1.5">
                <Label>On</Label>
                <Select value={String(draft.dayOfWeek)} onValueChange={(v) => set('dayOfWeek', Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((d, i) => (
                      <SelectItem key={d} value={String(i)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {draft.repeats === 'monthly' && (
              <div className="space-y-1.5">
                <Label>On</Label>
                <Select value={String(draft.dayOfMonth)} onValueChange={(v) => set('dayOfMonth', Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayChoices.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        The {ordinal(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {draft.repeats === 'yearly' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Select
                  value={String(draft.month)}
                  onValueChange={(v) => {
                    const month = Number(v);
                    setDraft((d) => ({ ...d, month, dayOfMonth: Math.min(d.dayOfMonth, daysInMonth(month)) }));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Day</Label>
                <Select value={String(draft.dayOfMonth)} onValueChange={(v) => set('dayOfMonth', Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayChoices.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {lateDay && (
            <p className="text-muted-foreground text-xs">
              Months without a {ordinal(draft.dayOfMonth)} are skipped. Pick the 28th or earlier to run every month.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rt-time">At</Label>
              <Input
                id="rt-time"
                type="time"
                value={draft.timeOfDay}
                onChange={(e) => set('timeOfDay', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Time zone</Label>
              <Select value={draft.timezone} onValueChange={(v) => set('timezone', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {zones.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={draft.priority} onValueChange={(v) => set('priority', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assign to</Label>
              <Select value={draft.assigneeId} onValueChange={(v) => set('assigneeId', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {assigneeMissing && (
                    <SelectItem value={draft.assigneeId}>
                      {memberName(draft.assigneeId, members) ?? 'Former member'}
                    </SelectItem>
                  )}
                  {assignable.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {memberName(m.id, members)}
                      {m.id === myMemberId ? ' (you)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={draft.categoryId} onValueChange={(v) => set('categoryId', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {describeSchedule(schedule)}.{' '}
              {first && (
                <>
                  First ticket:{' '}
                  <b className="text-foreground font-medium">
                    {first.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </b>
                  .
                </>
              )}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save' : 'Create schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
