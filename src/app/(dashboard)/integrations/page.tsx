'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plug, ShieldX } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useAuth } from '@/providers';
import { useBrands } from '@/lib/hooks';
import { useDisconnectInstallation, useInstallations, useUpdateInstallationBrands } from '@/lib/hooks/use-integrations';
import { formatDateTime, formatTimeAgo } from '@/lib/utils';
import { Installation } from '@/types/integration';

/**
 * Integrations connected through "Connect to Dispatch". Each one reaches only
 * the brands listed here; disconnecting stops its access at once and switches
 * off the webhooks and chat buttons it created.
 */
export default function IntegrationsPage() {
  const { session } = useAuth();
  const canManage = session?.orgRole === 'owner' || session?.orgRole === 'admin';
  const { data: installations, isLoading } = useInstallations();
  const { data: brands } = useBrands();
  const [editing, setEditing] = useState<Installation | null>(null);
  const [disconnecting, setDisconnecting] = useState<Installation | null>(null);
  const disconnect = useDisconnectInstallation();

  if (!canManage) {
    return (
      <div className="flex flex-col">
        <Header title="Integrations" />
        <div className="flex-1 p-4 md:p-6">
          <Card className="max-w-4xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldX className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground text-center">Only owners and admins can manage integrations.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const brandName = (id: string) => brands?.find((b) => b.id === id)?.name ?? 'Deleted brand';

  return (
    <div className="flex flex-col">
      <Header title="Integrations" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl space-y-6">
          <p className="text-muted-foreground">
            Apps you&apos;ve connected with &ldquo;Connect to Dispatch&rdquo;. Each can reach only the brands listed.
          </p>
          <Card>
            <CardHeader>
              <CardTitle>Connected</CardTitle>
              <CardDescription>Disconnecting stops access immediately and switches off its webhooks and chat buttons.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !installations?.length ? (
                <div className="text-center py-8">
                  <Plug className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-muted-foreground">No integrations connected yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    When an app offers &ldquo;Connect to Dispatch&rdquo;, you approve it here in Dispatch and it appears in this list.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {installations.map((inst) => (
                    <li key={inst.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {inst.app.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={inst.app.logoUrl} alt="" className="h-9 w-9 rounded-md object-cover flex-none" />
                        ) : (
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center flex-none">
                            <Plug className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium">{inst.app.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {inst.brandIds.map(brandName).join(', ')}
                          </p>
                          <p className="text-xs text-muted-foreground" title={formatDateTime(inst.connectedAt)}>
                            Connected {formatTimeAgo(inst.connectedAt)}
                            {inst.lastUsedAt ? ` · last used ${formatTimeAgo(inst.lastUsedAt)}` : ' · not used yet'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-none">
                        <Button variant="outline" size="sm" onClick={() => setEditing(inst)}>
                          Change brands
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDisconnecting(inst)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {editing && (
        <EditBrandsDialog
          installation={editing}
          brands={brands ?? []}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog open={Boolean(disconnecting)} onOpenChange={(open) => !open && setDisconnecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnecting?.app.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It loses access to your tickets immediately, and the webhooks and chat buttons it created are switched off.
              You can connect it again from the app later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!disconnecting) return;
                try {
                  await disconnect.mutateAsync(disconnecting.id);
                  toast.success(`${disconnecting.app.name} disconnected`);
                } catch {
                  toast.error("Couldn't disconnect. Try again.");
                } finally {
                  setDisconnecting(null);
                }
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditBrandsDialog({
  installation,
  brands,
  onClose,
}: {
  installation: Installation;
  brands: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(installation.brandIds);
  const update = useUpdateInstallationBrands();
  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((b) => b !== id) : [...cur, id]));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Brands {installation.app.name} can reach</DialogTitle>
          <DialogDescription>
            Removing a brand also switches off the webhooks and chat buttons it created there.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {brands.map((brand) => (
            <label key={brand.id} htmlFor={`edit-brand-${brand.id}`} className="flex items-center gap-3 text-sm cursor-pointer">
              <Checkbox
                id={`edit-brand-${brand.id}`}
                checked={selected.includes(brand.id)}
                onCheckedChange={() => toggle(brand.id)}
              />
              {brand.name}
            </label>
          ))}
          {selected.length === 0 && (
            <p className="text-sm text-amber-600">Pick at least one brand, or disconnect the integration instead.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={selected.length === 0 || update.isPending}
            onClick={async () => {
              try {
                await update.mutateAsync({ installationId: installation.id, brandIds: selected });
                toast.success('Brands updated');
                onClose();
              } catch {
                toast.error("Couldn't update the brands. Try again.");
              }
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
