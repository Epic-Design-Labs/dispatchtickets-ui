import type { RecurringTicketSchedule } from '@/types';

/**
 * The form's view of a schedule. "Every weekday" is not a server frequency: it
 * is daily + skipWeekends, so the form splits it out and joins it back.
 */
export type Repeats = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';

export const REPEATS_OPTIONS: { value: Repeats; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Every weekday' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Days a new monthly schedule may use: 29-31 would skip shorter months. */
export const SAFE_MAX_DAY = 28;

export function repeatsOf(s: RecurringTicketSchedule): Repeats {
  if (s.frequency === 'daily') return s.skipWeekends ? 'weekdays' : 'daily';
  return s.frequency;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(Date.UTC(2026, 0, 1, h, m));
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** "America/New_York" -> "New York time". */
export function zoneLabel(tz: string): string {
  return `${(tz.split('/').pop() ?? tz).replace(/_/g, ' ')} time`;
}

/** "Every Monday at 9:00 AM", plus the zone when it isn't the viewer's. */
export function describeSchedule(s: RecurringTicketSchedule): string {
  const at = `at ${formatTime(s.timeOfDay)}`;
  let text: string;
  switch (repeatsOf(s)) {
    case 'daily':
      text = `Every day ${at}`;
      break;
    case 'weekdays':
      text = `Every weekday ${at}`;
      break;
    case 'weekly':
      text = `Every ${WEEKDAYS[s.dayOfWeek ?? 1]} ${at}`;
      break;
    case 'monthly':
      text = `Monthly on the ${ordinal(s.dayOfMonth ?? 1)} ${at}`;
      break;
    case 'yearly':
      text = `Yearly on ${MONTHS[(s.month ?? 1) - 1]} ${s.dayOfMonth ?? 1} ${at}`;
      break;
  }
  if (s.timezone && s.timezone !== browserTimeZone()) text += ` (${zoneLabel(s.timezone)})`;
  return text;
}

/** Wall-clock parts of `date` in `timeZone`. */
function wallParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), hh: get('hour'), mm: get('minute') };
}

/**
 * The calendar date of the first run after `now`, in the schedule's own zone,
 * by the same rules the server uses (cron match, then skip Sat/Sun for
 * weekdays). A preview only -- the row shows the server's nextRunAt once saved.
 * Returned as a UTC-midnight Date: format it with timeZone 'UTC'.
 */
export function firstRunDate(s: RecurringTicketSchedule, now = new Date()): Date | null {
  let tz = s.timezone;
  try {
    wallParts(now, tz);
  } catch {
    tz = browserTimeZone();
  }
  const w = wallParts(now, tz);
  const nowKey = w.hh * 60 + w.mm;
  const [h, m] = s.timeOfDay.split(':').map(Number);
  const runKey = h * 60 + m;
  const repeats = repeatsOf(s);

  for (let i = 0; i < 800; i++) {
    const c = new Date(Date.UTC(w.y, w.m - 1, w.d + i));
    if (i === 0 && runKey <= nowKey) continue;
    const dow = c.getUTCDay();
    const dom = c.getUTCDate();
    const month = c.getUTCMonth() + 1;
    const ok =
      repeats === 'daily' ||
      (repeats === 'weekdays' && dow !== 0 && dow !== 6) ||
      (repeats === 'weekly' && dow === (s.dayOfWeek ?? 1)) ||
      (repeats === 'monthly' && dom === (s.dayOfMonth ?? 1)) ||
      (repeats === 'yearly' && dom === (s.dayOfMonth ?? 1) && month === (s.month ?? 1));
    if (!ok) continue;
    // Server skips weekends for any frequency when skipWeekends is set.
    if (s.skipWeekends && (dow === 0 || dow === 6)) continue;
    return c;
  }
  return null;
}

export function allTimeZones(current?: string): string[] {
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone');
  } catch {
    zones = [];
  }
  const extra = [browserTimeZone(), current].filter((z): z is string => !!z && !zones.includes(z));
  return [...extra, ...zones];
}
