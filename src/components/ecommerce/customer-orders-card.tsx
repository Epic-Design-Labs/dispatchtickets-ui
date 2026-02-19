'use client';

import { useStores, useCustomerOrders } from '@/lib/hooks';
import { OrderStatusBadge } from './order-status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink } from 'lucide-react';

interface CustomerOrdersCardProps {
  brandId: string;
  customerId: string;
}

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(parseFloat(amount));
}

export function CustomerOrdersCard({
  brandId,
  customerId,
}: CustomerOrdersCardProps) {
  const { data: stores, isLoading: storesLoading } = useStores(brandId);
  const { data: orders, isLoading: ordersLoading } = useCustomerOrders(
    brandId,
    customerId
  );

  const hasStores =
    !storesLoading &&
    stores &&
    stores.some((s) => s.status !== 'DISCONNECTED');

  // Don't render if no stores are connected
  if (!hasStores) return null;

  const activeStores = stores?.filter((s) => s.status !== 'DISCONNECTED') || [];

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {ordersLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : orders && orders.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const store = activeStores.find(
                  (s) => s.id === order.storeId
                );
                const adminUrl = store?.storeUrl
                  ? `${store.storeUrl.replace(/\/$/, '')}/manage/orders/${order.platformOrderId}`
                  : null;

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      #{order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      {formatCurrency(order.total, order.currency)}
                    </TableCell>
                    <TableCell>
                      {order.items?.length ?? '—'}
                    </TableCell>
                    <TableCell>
                      {order.platformCreatedAt
                        ? new Date(
                            order.platformCreatedAt
                          ).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {adminUrl && (
                        <a
                          href={adminUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No orders found for this customer
          </p>
        )}
      </CardContent>
    </Card>
  );
}
