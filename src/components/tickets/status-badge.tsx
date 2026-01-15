import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type NonNullStatus = 'open' | 'pending' | 'resolved' | 'closed' | 'spam';

const statusConfig: Record<NonNullStatus, { label: string; className: string }> = {
  open: {
    label: 'Open',
    className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
  },
  spam: {
    label: 'Spam',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
};

interface StatusBadgeProps {
  status: NonNullStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="secondary"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
