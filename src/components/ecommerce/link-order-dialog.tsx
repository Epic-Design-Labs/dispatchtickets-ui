'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useOrders, useLinkOrder } from '@/lib/hooks';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { OrderStatusBadge } from './order-status-badge';
import { EcommerceOrder } from '@/types';
import { toast } from 'sonner';

interface LinkOrderDialogProps {
  brandId: string;
  ticketId: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
}

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(parseFloat(amount));
}

export function LinkOrderDialog({
  brandId,
  ticketId,
  children,
  onSuccess,
}: LinkOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<EcommerceOrder | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { data: ordersData, isLoading } = useOrders(brandId, {
    search: debouncedSearch,
    limit: 10,
  });
  const orders = ordersData?.data || [];
  const linkOrder = useLinkOrder(brandId);

  const handleLink = async () => {
    if (!selectedOrder) return;

    try {
      await linkOrder.mutateAsync({
        orderId: selectedOrder.id,
        data: { ticketId, linkType: 'MANUAL' },
      });
      toast.success(`Order ${selectedOrder.orderNumber} linked`);
      setOpen(false);
      setSearch('');
      setSelectedOrder(null);
      onSuccess?.();
    } catch {
      toast.error('Failed to link order');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Link Order
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link Order to Ticket</DialogTitle>
          <DialogDescription>
            Search for an order by number, customer name, or email.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Command shouldFilter={false} className="border rounded-md">
            <CommandInput
              placeholder="Search orders by number or customer..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[200px]">
              {isLoading && debouncedSearch.length >= 1 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
              {!isLoading && debouncedSearch.length >= 1 && orders.length === 0 && (
                <CommandEmpty className="py-6 text-center text-sm">
                  No orders found
                </CommandEmpty>
              )}
              {!isLoading && debouncedSearch.length < 1 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Type to search orders...
                </div>
              )}
              {orders.length > 0 && (
                <CommandGroup>
                  {orders.map((order) => (
                    <CommandItem
                      key={order.id}
                      value={order.id}
                      onSelect={() => setSelectedOrder(order)}
                      className={selectedOrder?.id === order.id ? 'bg-accent' : ''}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            #{order.orderNumber}
                          </span>
                          <OrderStatusBadge status={order.status} />
                          <span className="ml-auto text-sm font-medium">
                            {formatCurrency(order.total, order.currency)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.customerName || order.customerEmail || 'Unknown customer'}
                          {order.platformCreatedAt &&
                            ` \u00b7 ${new Date(order.platformCreatedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>

          {selectedOrder && (
            <div className="mt-4 p-3 rounded-md border bg-muted/50">
              <p className="text-sm font-medium">Selected:</p>
              <p className="text-sm">
                Order #{selectedOrder.orderNumber} &mdash;{' '}
                {formatCurrency(selectedOrder.total, selectedOrder.currency)}
              </p>
              {selectedOrder.customerName && (
                <p className="text-xs text-muted-foreground">
                  {selectedOrder.customerName}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setSearch('');
              setSelectedOrder(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedOrder || linkOrder.isPending}
          >
            {linkOrder.isPending ? 'Linking...' : 'Link Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
