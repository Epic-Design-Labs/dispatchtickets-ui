import { cn } from '@/lib/utils';
import { Pill } from './pill';

type NonNullPriority = 'low' | 'normal' | 'medium' | 'high' | 'urgent';

/**
 * Priority climbs from quiet to loud: grey, then the brand violet for the
 * default, then blue, then a red tint, and finally a solid red that is the one
 * chip in a row allowed to shout.
 */
const priorityConfig: Record<NonNullPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-secondary text-muted-foreground' },
  normal: { label: 'Normal', className: 'bg-brand-soft text-brand' },
  medium: { label: 'Medium', className: 'bg-info-soft text-info' },
  high: { label: 'High', className: 'bg-danger-soft text-danger' },
  urgent: { label: 'Urgent', className: 'bg-danger text-white' },
};

interface PriorityBadgeProps {
  priority: NonNullPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  // The API's priority vocabulary can grow ahead of this map, and callers cast
  // a plain string into the prop -- so an unknown value renders as itself in
  // grey rather than throwing and taking the whole table down with it.
  const config = priorityConfig[priority] ?? {
    label: priority,
    className: 'bg-secondary text-muted-foreground',
  };

  // Priority is read next to status, and two dotted chips side by side read as
  // one list rather than two separate facts -- so this one goes without.
  return <Pill dot={false} className={cn(config.className, className)}>{config.label}</Pill>;
}
