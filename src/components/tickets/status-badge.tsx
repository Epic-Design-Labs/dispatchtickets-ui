import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type NonNullStatus = 'open' | 'pending' | 'resolved' | 'closed';

const statusConfig: Record<NonNullStatus, { label: string; className: string }> = {
  open: {
    label: 'Open',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
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
