'use client';

import { Badge } from '@/components/ui/badge';
import { EcommerceOrderStatus } from '@/types';

const statusConfig: Record<
  EcommerceOrderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  },
  PROCESSING: {
    label: 'Processing',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  },
  SHIPPED: {
    label: 'Shipped',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  DELIVERED: {
    label: 'Delivered',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  },
  REFUNDED: {
    label: 'Refunded',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  },
  DISPUTED: {
    label: 'Disputed',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
};

interface OrderStatusBadgeProps {
  status: EcommerceOrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  };

  return (
    <Badge variant="secondary" className={`${config.className} ${className || ''}`}>
      {config.label}
    </Badge>
  );
}
