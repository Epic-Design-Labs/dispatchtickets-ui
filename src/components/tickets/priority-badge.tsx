import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type NonNullPriority = 'low' | 'normal' | 'medium' | 'high' | 'urgent';

const priorityConfig: Record<NonNullPriority, { label: string; className: string }> = {
  low: {
    label: 'Low',
    className: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
  },
  normal: {
    label: 'Normal',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  medium: {
    label: 'Medium',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  high: {
    label: 'High',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  },
  urgent: {
    label: 'Urgent',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
};

interface PriorityBadgeProps {
  priority: NonNullPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];

  return (
    <Badge
      variant="secondary"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
