export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTicketSchedule {
  frequency: ScheduleFrequency;
  dayOfWeek?: number; // 0=Sunday, 6=Saturday
  dayOfMonth?: number; // 1-31
  month?: number; // 1-12
  timeOfDay: string; // "HH:mm"
  timezone: string; // IANA timezone
  skipWeekends?: boolean;
}

export interface RecurringTicket {
  id: string;
  brandId: string;
  accountId: string;
  title: string;
  body?: string | null;
  priority?: string | null;
  assigneeId?: string | null;
  categoryId?: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  schedule: RecurringTicketSchedule;
  cronExpr?: string | null;
  timezone: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt?: string | null;
  lastTicketId?: string | null;
  runCount: number;
  failCount: number;
  lastError?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTicketListResponse {
  data: RecurringTicket[];
  total: number;
}

export interface CreateRecurringTicketInput {
  title: string;
  body?: string;
  priority?: string;
  assigneeId?: string;
  categoryId?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  schedule: RecurringTicketSchedule;
  cronExpr?: string;
}

export interface UpdateRecurringTicketInput {
  title?: string;
  body?: string;
  priority?: string;
  assigneeId?: string;
  categoryId?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  schedule?: RecurringTicketSchedule;
  cronExpr?: string;
}

export interface ListRecurringTicketsParams {
  status?: 'active' | 'paused' | 'all';
  limit?: number;
  offset?: number;
  sortBy?: 'nextRunAt' | 'createdAt' | 'title';
  order?: 'asc' | 'desc';
}
