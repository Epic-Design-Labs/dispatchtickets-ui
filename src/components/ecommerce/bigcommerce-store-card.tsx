'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStores, useConnectStore, useDisconnectStore, useTriggerSync, useSubscription } from '@/lib/hooks';
import { EcommerceStore, EcommerceStoreStatus } from '@/types';
import { toast } from 'sonner';
import { RefreshCw, Unplug, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';

const statusDisplay: Record<
  EcommerceStoreStatus,
  { label: string; dotClass: string }
> = {
  ACTIVE: { label: 'Connected', dotClass: 'bg-green-500' },
  SYNCING: { label: 'Syncing', dotClass: 'bg-yellow-500 animate-pulse' },
  PENDING_SETUP: { label: 'Setting up', dotClass: 'bg-yellow-500 animate-pulse' },
  ERROR: { label: 'Error', dotClass: 'bg-red-500' },
  DISCONNECTED: { label: 'Disconnected', dotClass: 'bg-gray-400' },
};

function formatSyncTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function ConnectedStoreView({
  store,
  brandId,
}: {
  store: EcommerceStore;
  brandId: string;
}) {
  const [showDisconnect, setShowDisconnect] = useState(false);
  const disconnectStore = useDisconnectStore(brandId);
  const triggerSync = useTriggerSync(brandId);
  const status = statusDisplay[store.status] || statusDisplay.ACTIVE;

  const handleSync = async () => {
    try {
      await triggerSync.mutateAsync(store.id);
      toast.success('Sync started');
    } catch {
      toast.error('Failed to start sync');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectStore.mutateAsync(store.id);
      toast.success('Store disconnected');
      setShowDisconnect(false);
    } catch {
      toast.error('Failed to disconnect store');
    }
  };

  return (
    <>
      <div className="border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded bg-[#121118] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M12.006 18.985L3.607 12.88l1.876-1.397 6.523 4.854 6.52-4.856 1.877 1.4-8.397 6.104zm0-4.166L3.607 8.714l8.399-6.103 8.397 6.103-8.397 6.105z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{store.name}</h3>
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                <span className="text-xs text-muted-foreground">
                  {status.label}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Last synced: {formatSyncTime(store.lastSyncAt)}
            </p>
          </div>
        </div>

        {store.status === 'ERROR' && store.errorMessage && (
          <p className="text-sm text-red-600 mb-3">{store.errorMessage}</p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={
              triggerSync.isPending || store.status === 'SYNCING'
            }
          >
            {triggerSync.isPending || store.status === 'SYNCING' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDisconnect(true)}
          >
            <Unplug className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </div>

      <AlertDialog open={showDisconnect} onOpenChange={setShowDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect {store.name}? Synced order data will be preserved, but no new data will be synced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={disconnectStore.isPending}
            >
              {disconnectStore.isPending ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface BigCommerceStoreCardProps {
  brandId: string;
}

export function BigCommerceStoreCard({ brandId }: BigCommerceStoreCardProps) {
  const { data: stores } = useStores(brandId);
  const { data: subscriptionData } = useSubscription();
  const connectStore = useConnectStore(brandId);
  const [showConnect, setShowConnect] = useState(false);
  const [storeHash, setStoreHash] = useState('');
  const [apiToken, setApiToken] = useState('');

  const isPaid = subscriptionData?.subscription && subscriptionData.subscription.planPrice > 0;

  const bcStores = (stores || []).filter((s) => s.platform === 'BIGCOMMERCE');
  const connectedStore = bcStores.find(
    (s) => s.status !== 'DISCONNECTED'
  );

  if (connectedStore) {
    return <ConnectedStoreView store={connectedStore} brandId={brandId} />;
  }

  if (!isPaid) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded bg-[#121118] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M12.006 18.985L3.607 12.88l1.876-1.397 6.523 4.854 6.52-4.856 1.877 1.4-8.397 6.104zm0-4.166L3.607 8.714l8.399-6.103 8.397 6.103-8.397 6.105z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">BigCommerce</h3>
            <p className="text-sm text-muted-foreground">Sync orders and customers</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          View customer order history, create tickets from orders, and access customer data directly in tickets.
        </p>
        <Button variant="outline" className="mt-4 w-full" asChild>
          <Link href="/billing">
            <Lock className="mr-2 h-4 w-4" />
            Upgrade to Connect
          </Link>
        </Button>
      </div>
    );
  }

  const handleConnect = async () => {
    if (!storeHash.trim() || !apiToken.trim()) {
      toast.error('Please enter both store hash and API token');
      return;
    }

    try {
      await connectStore.mutateAsync({
        platform: 'BIGCOMMERCE',
        accessToken: apiToken.trim(),
        storeHash: storeHash.trim(),
      });
      toast.success('Store connected! Syncing data now...');
      setShowConnect(false);
      setStoreHash('');
      setApiToken('');
    } catch {
      toast.error('Failed to connect store. Check your store hash and API token.');
    }
  };

  return (
    <>
      <div className="border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded bg-[#121118] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M12.006 18.985L3.607 12.88l1.876-1.397 6.523 4.854 6.52-4.856 1.877 1.4-8.397 6.104zm0-4.166L3.607 8.714l8.399-6.103 8.397 6.103-8.397 6.105z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">BigCommerce</h3>
            <p className="text-sm text-muted-foreground">Sync orders and customers</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          View customer order history, create tickets from orders, and access customer data directly in tickets.
        </p>
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => setShowConnect(true)}
        >
          Connect BigCommerce
        </Button>
      </div>

      <Dialog open={showConnect} onOpenChange={setShowConnect}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Connect BigCommerce Store</DialogTitle>
            <DialogDescription>
              Enter your BigCommerce store hash and API token. You can create an API token in your BigCommerce admin under Settings &gt; API &gt; API Accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="store-hash">Store Hash</Label>
              <Input
                id="store-hash"
                placeholder="e.g. abc123def"
                value={storeHash}
                onChange={(e) => setStoreHash(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Found in your BigCommerce admin URL: store-<strong>abc123def</strong>.mybigcommerce.com
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-token">API Token</Label>
              <Input
                id="api-token"
                type="password"
                placeholder="Your API access token"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Create a token with read access to Orders, Products, and Customers.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConnect(false);
                setStoreHash('');
                setApiToken('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={connectStore.isPending || !storeHash.trim() || !apiToken.trim()}
            >
              {connectStore.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
