'use client';

import { useStores, useTicketOrders, useUnlinkOrder } from '@/lib/hooks';
import { OrderStatusBadge } from './order-status-badge';
import { LinkOrderDialog } from './link-order-dialog';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';

interface TicketOrdersSectionProps {
  brandId: string;
  ticketId: string;
}

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(parseFloat(amount));
}

export function TicketOrdersSection({
  brandId,
  ticketId,
}: TicketOrdersSectionProps) {
  const { data: stores, isLoading: storesLoading } = useStores(brandId);
  const { data: orders, isLoading: ordersLoading } = useTicketOrders(
    brandId,
    ticketId
  );
  const unlinkOrder = useUnlinkOrder(brandId);

  const hasStores =
    !storesLoading &&
    stores &&
    stores.some((s) => s.status !== 'DISCONNECTED');

  // Don't render anything if no stores are connected
  if (!hasStores) return null;

  const handleUnlink = async (orderId: string) => {
    try {
      await unlinkOrder.mutateAsync({ orderId, ticketId });
      toast.success('Order unlinked');
    } catch {
      toast.error('Failed to unlink order');
    }
  };

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShoppingCart className="h-4 w-4" />
            Orders
          </div>
          <LinkOrderDialog brandId={brandId} ticketId={ticketId}>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Link Order
            </Button>
          </LinkOrderDialog>
        </div>

        {ordersLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-2">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-2 p-2 -mx-2 rounded hover:bg-gray-100 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      #{order.orderNumber}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatCurrency(order.total, order.currency)}</span>
                    {order.platformCreatedAt && (
                      <>
                        <span>&middot;</span>
                        <span>
                          {new Date(order.platformCreatedAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleUnlink(order.id)}
                  disabled={unlinkOrder.isPending}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No linked orders</p>
        )}
      </div>
    </>
  );
}
