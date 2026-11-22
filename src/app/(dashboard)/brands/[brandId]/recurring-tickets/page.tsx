'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, MoreHorizontal, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useBrand,
  useCategories,
  useDeleteRecurringTicket,
  usePauseRecurringTicket,
  useRecurringTickets,
  useResumeRecurringTicket,
  useTeamMembers,
  useTriggerRecurringTicket,
} from '@/lib/hooks';
import { useAuth } from '@/providers';
import { memberName } from '@/lib/member-name';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RecurringTicketDialog } from '@/components/recurring/recurring-ticket-dialog';
import { describeSchedule } from '@/components/recurring/schedule';
import type { RecurringTicket } from '@/types';

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export default function RecurringTicketsPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const { session } = useAuth();
  const myMemberId = session?.memberId;

  const { data: brand } = useBrand(brandId);
  const { data, isLoading } = useRecurringTickets(brandId, { status: 'all', limit: 100 });
  const { data: team } = useTeamMembers();
  const { data: categories } = useCategories(brandId);
  const members = team?.members ?? [];

  const pause = usePauseRecurringTicket(brandId);
  const resume = useResumeRecurringTicket(brandId);
  const trigger = useTriggerRecurringTicket(brandId);
  const remove = useDeleteRecurringTicket(brandId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTicket | null>(null);
  const [deleting, setDeleting] = useState<RecurringTicket | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const schedules = data?.data ?? [];

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (rt: RecurringTicket) => {
    setEditing(rt);
    setDialogOpen(true);
  };

  const toggle = async (rt: RecurringTicket, on: boolean) => {
    setToggling(rt.id);
    try {
      await (on ? resume : pause).mutateAsync(rt.id);
      toast.success(on ? `${rt.title} resumed` : `${rt.title} paused`);
    } catch {
      toast.error(on ? 'Could not resume it' : 'Could not pause it');
    } finally {
      setToggling(null);
    }
  };

  const runNow = async (rt: RecurringTicket) => {
    try {
      const ticket = await trigger.mutateAsync(rt.id);
      toast.success(`Ticket #${ticket.ticketNumber} created from “${rt.title}”`, {
        action: { label: 'View', onClick: () => router.push(`/brands/${brandId}/tickets/${ticket.id}`) },
      });
    } catch {
      toast.error('Could not create the ticket');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Schedule deleted');
      setDeleting(null);
    } catch {
      toast.error('Could not delete the schedule');
    }
  };

  const assigneeText = (rt: RecurringTicket) => {
    if (!rt.assigneeId) return 'Unassigned';
    if (rt.assigneeId === myMemberId) return 'Assigned to you';
    return `Assigned to ${memberName(rt.assigneeId, members) ?? 'a former member'}`;
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recurring</h1>
          <p className="text-muted-foreground">
            Tickets created automatically on a schedule{brand?.name ? ` for ${brand.name}` : ''}.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          New recurring ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-card divide-y rounded-xl border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-80" />
              </div>
            </div>
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-card flex flex-col items-center rounded-xl border px-6 py-14 text-center">
          <span className="bg-muted text-muted-foreground mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
            <Repeat className="h-6 w-6" />
          </span>
          <h3 className="font-semibold">No recurring tickets yet</h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Set up a ticket that repeats, like a monthly site check or a weekly report.
          </p>
          <Button className="mt-5" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            New recurring ticket
          </Button>
        </div>
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {schedules.map((rt) => {
            const priority = rt.priority ? PRIORITY_LABEL[rt.priority] : undefined;
            const failing = rt.failCount > 0 && rt.lastError;
            return (
              <li key={rt.id} className="flex items-center gap-4 p-4">
                <span
                  className={cn(
                    'bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    !rt.enabled && 'opacity-50',
                  )}
                >
                  <Repeat className="h-4 w-4" />
                </span>

                <div className={cn('min-w-0 flex-1', !rt.enabled && 'opacity-60')}>
                  <div className="truncate font-medium">{rt.title}</div>
                  <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                    <span>{describeSchedule(rt.schedule)}</span>
                    <span>{assigneeText(rt)}</span>
                    {priority && <span>{priority} priority</span>}
                  </div>
                  {failing && (
                    <div className="text-destructive mt-1 flex items-center gap-1.5 text-sm">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Last run failed: {rt.lastError}</span>
                    </div>
                  )}
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  {rt.enabled ? (
                    <>
                      <div className="text-muted-foreground text-xs">Next</div>
                      <div className="text-sm font-medium">
                        {new Date(rt.nextRunAt).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          timeZone: rt.timezone || undefined,
                        })}
                      </div>
                    </>
                  ) : (
                    <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                      Paused
                    </span>
                  )}
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {rt.runCount} created so far
                  </div>
                </div>

                <Switch
                  checked={rt.enabled}
                  disabled={toggling === rt.id}
                  onCheckedChange={(on) => toggle(rt, on)}
                  aria-label={`${rt.enabled ? 'Pause' : 'Resume'} ${rt.title}`}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`More actions for ${rt.title}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => runNow(rt)} disabled={trigger.isPending}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create a ticket now
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(rt)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit schedule
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleting(rt)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete schedule
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <RecurringTicketDialog
        brandId={brandId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        members={members}
        categories={categories ?? []}
        myMemberId={myMemberId}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              No more tickets will be created. Tickets it already created stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={remove.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
