'use client';

import { Inbox, Layers, CircleDot, Clock, CheckCircle2, Archive, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The status filter row, shared by the global queue and every brand's queue.
 *
 * It lives in one place because it did not used to: the two pages each grew
 * their own copy and drifted, down to picking different colours for the same
 * tab -- "Active" was violet on one page and amber on the other, for the same
 * set of tickets. One component means that cannot happen again.
 *
 * Each tab's icon tone matches the status chips in the table below it, so a
 * glance at "Pending" up here and a pending row down there agree. The selected
 * tab fills solid brand rather than merely gaining a border: this is the most
 * used control on either page and an outline was not enough to say which queue
 * you were looking at.
 */
export interface StatusTabDef {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: string;
}

export const STATUS_TABS: StatusTabDef[] = [
  { key: 'active', label: 'Active', icon: Inbox, tone: 'bg-brand-soft text-brand' },
  { key: 'all', label: 'All', icon: Layers, tone: 'bg-secondary text-muted-foreground' },
  { key: 'open', label: 'Open', icon: CircleDot, tone: 'bg-info-soft text-info' },
  { key: 'pending', label: 'Pending', icon: Clock, tone: 'bg-warning-soft text-warning-foreground' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2, tone: 'bg-success-soft text-success-foreground' },
  { key: 'closed', label: 'Closed', icon: Archive, tone: 'bg-secondary text-muted-foreground' },
];

interface StatusTabsProps {
  /** The active status filter. Empty or undefined counts as 'active'. */
  value?: string | null;
  /**
   * Omit to render the row as a read-only summary rather than a filter.
   *
   * The statistics page shows the same six figures but changes nothing when
   * you click them, and it had its own copy of this markup built out of divs
   * -- which is how it ended up drawing "Open" in emerald while both queues
   * drew it in blue. One component covers both, and a row that filters nothing
   * is spans rather than buttons, so it does not invite the click.
   */
  onSelect?: (key: string) => void;
  counts: Record<string, number | undefined>;
  /** Show a placeholder in the count chips rather than a misleading zero. */
  loading?: boolean;
  className?: string;
}

export function StatusTabs({ value, onSelect, counts, loading, className }: StatusTabsProps) {
  const interactive = !!onSelect;
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {STATUS_TABS.map((tab) => {
        // 'active' is the default view, so it owns the empty value too. A
        // read-only row highlights nothing: there is no selection to show.
        const isActive =
          interactive && (tab.key === 'active' ? !value || value === 'active' : value === tab.key);
        const Icon = tab.icon;
        const Tag = interactive ? 'button' : 'div';
        return (
          <Tag
            key={tab.key}
            {...(interactive
              ? { type: 'button' as const, onClick: () => onSelect(tab.key), 'aria-pressed': isActive }
              : {})}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg border py-[5px] pr-2.5 pl-[5px]',
              'text-sm font-medium',
              isActive
                ? 'border-brand bg-brand text-white shadow-[0_2px_8px_rgba(124,77,255,0.25)]'
                : 'border-border-strong bg-card',
              interactive && !isActive && 'hover:bg-surface-muted transition-colors'
            )}
          >
            <span
              className={cn(
                'grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px]',
                isActive ? 'bg-white/20 text-white' : tab.tone
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            {tab.label}
            <span
              className={cn(
                'rounded-md px-2 py-px text-[13px] tabular-nums',
                isActive ? 'bg-white/25 text-white' : 'bg-secondary text-muted-foreground'
              )}
            >
              {loading ? '–' : (counts[tab.key] ?? 0)}
            </span>
          </Tag>
        );
      })}
    </div>
  );
}

interface MetricChipProps {
  icon: LucideIcon;
  value: string;
  label: string;
}

/**
 * A response-time figure beside the tabs.
 *
 * Deliberately NOT shaped like a tab: these were built as buttons on both
 * pages, which invited clicks that did nothing. They are facts, so they read
 * as facts.
 */
export function MetricChip({ icon: Icon, value, label }: MetricChipProps) {
  return (
    <div className="bg-card flex shrink-0 items-center gap-2 rounded-lg border px-3 py-[7px] text-sm">
      <Icon className="text-brand h-4 w-4" />
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  );
}
