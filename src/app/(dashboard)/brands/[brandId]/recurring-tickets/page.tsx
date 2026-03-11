'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useBrand,
  useRecurringTickets,
  useCreateRecurringTicket,
  useDeleteRecurringTicket,
  usePauseRecurringTicket,
  useResumeRecurringTicket,
  useTriggerRecurringTicket,
  useTeamMembers,
  useCategories,
} from '@/lib/hooks';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDateTime, formatTimeAgo } from '@/lib/utils';
import {
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  RecurringTicket,
  CreateRecurringTicketInput,
  ScheduleFrequency,
  ListRecurringTicketsParams,
} from '@/types';

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const FREQUENCIES: { value: ScheduleFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function describeSchedule(rt: RecurringTicket): string {
  const s = rt.schedule;
  const time = s.timeOfDay;
  const tz = s.timezone.replace(/_/g, ' ');

  switch (s.frequency) {
    case 'daily':
      return `Every day at ${time} ${tz}${s.skipWeekends ? ' (weekdays only)' : ''}`;
    case 'weekly':
      return `Every ${DAYS_OF_WEEK[s.dayOfWeek ?? 1]} at ${time} ${tz}`;
    case 'monthly':
      return `Monthly on day ${s.dayOfMonth ?? 1} at ${time} ${tz}`;
    case 'yearly':
      return `Yearly on ${s.month ?? 1}/${s.dayOfMonth ?? 1} at ${time} ${tz}`;
    default:
      return rt.cronExpr || 'Custom schedule';
  }
}

export default function RecurringTicketsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const [statusFilter, setStatusFilter] = useState<ListRecurringTicketsParams['status']>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: brand } = useBrand(brandId);
  const { data, isLoading } = useRecurringTickets(brandId, {
    status: statusFilter,
  });
  const { data: teamMembers } = useTeamMembers();
  const { data: categories } = useCategories(brandId);

  const createMutation = useCreateRecurringTicket(brandId);
  const deleteMutation = useDeleteRecurringTicket(brandId);
  const pauseMutation = usePauseRecurringTicket(brandId);
  const resumeMutation = useResumeRecurringTicket(brandId);
  const triggerMutation = useTriggerRecurringTicket(brandId);

  // Create form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState('09:00');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [skipWeekends, setSkipWeekends] = useState(false);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setPriority('');
    setAssigneeId('');
    setCategoryId('');
    setFrequency('weekly');
    setDayOfWeek(1);
    setDayOfMonth(1);
    setTimeOfDay('09:00');
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setSkipWeekends(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    const input: CreateRecurringTicketInput = {
      title: title.trim(),
      body: body.trim() || undefined,
      priority: priority || undefined,
      assigneeId: assigneeId || undefined,
      categoryId: categoryId || undefined,
      schedule: {
        frequency,
        timeOfDay,
        timezone,
        skipWeekends: skipWeekends || undefined,
        ...(frequency === 'weekly' ? { dayOfWeek } : {}),
        ...(frequency === 'monthly' || frequency === 'yearly'
          ? { dayOfMonth }
          : {}),
      },
    };

    try {
      await createMutation.mutateAsync(input);
      toast.success('Recurring ticket created');
      setCreateOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to create recurring ticket');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Recurring ticket deleted');
    } catch {
      toast.error('Failed to delete recurring ticket');
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseMutation.mutateAsync(id);
      toast.success('Recurring ticket paused');
    } catch {
      toast.error('Failed to pause recurring ticket');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeMutation.mutateAsync(id);
      toast.success('Recurring ticket resumed');
    } catch {
      toast.error('Failed to resume recurring ticket');
    }
  };

  const handleTrigger = async (id: string) => {
    try {
      await triggerMutation.mutateAsync(id);
      toast.success('Ticket created from template');
    } catch {
      toast.error('Failed to create ticket');
    }
  };

  const templates = data?.data || [];

  return (
    <div className="flex flex-col">
      <Header title={`${brand?.name || ''} - Recurring Tickets`} />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold tracking-tight">
              Recurring Tickets
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as ListRecurringTicketsParams['status'])
              }
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Recurring Ticket</DialogTitle>
                  <DialogDescription>
                    Define a ticket template and schedule. Tickets will be
                    created automatically.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {/* Template fields */}
                  <div>
                    <Label htmlFor="title">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Weekly Security Review - {{date}}"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Placeholders: {'{{date}}'}, {'{{count}}'}, {'{{month}}'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="body">Description</Label>
                    <Textarea
                      id="body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Review the security dashboard and..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Assignee</Label>
                      <Select value={assigneeId} onValueChange={setAssigneeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers?.members?.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {categories && categories.length > 0 && (
                    <div>
                      <Label>Category</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Schedule */}
                  <div className="border-t pt-4">
                    <h4 className="mb-3 text-sm font-medium">Schedule</h4>

                    <div className="space-y-3">
                      <div>
                        <Label>Frequency</Label>
                        <Select
                          value={frequency}
                          onValueChange={(v) =>
                            setFrequency(v as ScheduleFrequency)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCIES.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {frequency === 'weekly' && (
                        <div>
                          <Label>Day of Week</Label>
                          <Select
                            value={String(dayOfWeek)}
                            onValueChange={(v) => setDayOfWeek(Number(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_WEEK.map((name, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {(frequency === 'monthly' || frequency === 'yearly') && (
                        <div>
                          <Label>Day of Month</Label>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            value={dayOfMonth}
                            onChange={(e) =>
                              setDayOfMonth(Number(e.target.value))
                            }
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Time</Label>
                          <Input
                            type="time"
                            value={timeOfDay}
                            onChange={(e) => setTimeOfDay(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Timezone</Label>
                          <Input
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            placeholder="America/New_York"
                          />
                        </div>
                      </div>

                      {frequency === 'daily' && (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={skipWeekends}
                            onCheckedChange={setSkipWeekends}
                          />
                          <Label className="cursor-pointer">
                            Skip weekends
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">No recurring tickets</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a template to automatically generate tickets on a
                schedule.
              </p>
              <Button
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((rt) => (
              <Card key={rt.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {rt.title}
                        </CardTitle>
                        {rt.enabled ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/10">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Paused</Badge>
                        )}
                        {rt.failCount > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {rt.failCount} failures
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {describeSchedule(rt)}
                      </CardDescription>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleTrigger(rt.id)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Run Now
                        </DropdownMenuItem>
                        {rt.enabled ? (
                          <DropdownMenuItem
                            onClick={() => handlePause(rt.id)}
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleResume(rt.id)}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Resume
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(rt.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">
                        Next run:
                      </span>{' '}
                      {formatTimeAgo(rt.nextRunAt)}
                    </div>
                    {rt.lastRunAt && (
                      <div>
                        <span className="font-medium text-foreground">
                          Last run:
                        </span>{' '}
                        {formatTimeAgo(rt.lastRunAt)}
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-foreground">
                        Tickets created:
                      </span>{' '}
                      {rt.runCount}
                    </div>
                    {rt.lastError && (
                      <div className="text-destructive">
                        <span className="font-medium">Error:</span>{' '}
                        {rt.lastError}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
