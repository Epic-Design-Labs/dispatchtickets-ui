'use client';

import { cn } from '@/lib/utils';
import { Pill } from '@/components/tickets/pill';
import { EcommerceOrderStatus } from '@/types';

/**
 * Order states on the ticket palette, so an order chip sits next to a ticket's
 * status chip without introducing a second colour language.
 *
 * Eight states, six tones, so two pairs share one. The pairs chosen are the
 * ones that mean nearly the same thing to an agent reading a row: delivered
 * and completed, pending and refunded. The pair deliberately BROKEN apart is
 * pending and processing, which were both amber and therefore indistinguishable
 * -- "we have not started" and "we are working on it" are the two an agent
 * actually acts on differently.
 */
const statusConfig: Record<EcommerceOrderStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-warning-soft text-warning-foreground' },
  PROCESSING: { label: 'Processing', className: 'bg-brand-soft text-brand' },
  SHIPPED: { label: 'Shipped', className: 'bg-info-soft text-info' },
  DELIVERED: { label: 'Delivered', className: 'bg-success-soft text-success-foreground' },
  COMPLETED: { label: 'Completed', className: 'bg-success-soft text-success-foreground' },
  CANCELLED: { label: 'Cancelled', className: 'bg-secondary text-muted-foreground' },
  REFUNDED: { label: 'Refunded', className: 'bg-warning-soft text-warning-foreground' },
  DISPUTED: { label: 'Disputed', className: 'bg-danger-soft text-danger' },
};

interface OrderStatusBadgeProps {
  status: EcommerceOrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  // A platform can report a state this map has not caught up with; show it as
  // itself in grey rather than rendering a blank chip.
  const config = statusConfig[status] ?? {
    label: status,
    className: 'bg-secondary text-muted-foreground',
  };

  return <Pill className={cn(config.className, className)}>{config.label}</Pill>;
}
