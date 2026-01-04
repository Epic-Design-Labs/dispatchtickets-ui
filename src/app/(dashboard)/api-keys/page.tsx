'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Key, Plus, Trash2, Copy, Check, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '@/lib/hooks/use-api-keys';
import { useBrands } from '@/lib/hooks';
import { ApiKey } from '@/types/api-key';

function formatDate(date: string | null) {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function CreateKeyDialog({ onSuccess }: { onSuccess: (key: ApiKey) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [allBrands, setAllBrands] = useState(true);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const { data: brands } = useBrands();
  const createKey = useCreateApiKey();

  const handleCreate = async () => {
    try {
      const key = await createKey.mutateAsync({
        name: name.trim() || undefined,
        allBrands,
        brandIds: allBrands ? undefined : selectedBrands,
      });
      onSuccess(key);
      setOpen(false);
      setName('');
      setAllBrands(true);
      setSelectedBrands([]);
    } catch {
      toast.error('Failed to create API key');
    }
  };

  const toggleBrand = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for accessing the Dispatch Tickets API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              placeholder="e.g., Production API Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Access all brands</Label>
                <p className="text-sm text-muted-foreground">
                  Allow this key to access all current and future brands
                </p>
              </div>
              <Switch checked={allBrands} onCheckedChange={setAllBrands} />
            </div>

            {!allBrands && brands && brands.length > 0 && (
              <div className="border rounded-md p-3 space-y-2">
                <Label className="text-sm font-medium">Select brands</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {brands.map((brand) => (
                    <label
                      key={brand.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedBrands.includes(brand.id)}
                        onCheckedChange={() => toggleBrand(brand.id)}
                      />
                      <span className="text-sm">{brand.name}</span>
                    </label>
                  ))}
                </div>
                {selectedBrands.length === 0 && (
                  <p className="text-sm text-amber-600">
                    Select at least one brand
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createKey.isPending || (!allBrands && selectedBrands.length === 0)}
          >
            {createKey.isPending ? 'Creating...' : 'Create Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewKeyDisplay({ apiKey, onClose }: { apiKey: ApiKey; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyKey = async () => {
    if (apiKey.key) {
      await navigator.clipboard.writeText(apiKey.key);
      setCopied(true);
      toast.success('API key copied to clipboard');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            API Key Created
          </DialogTitle>
          <DialogDescription>
            Copy your API key now. You won&apos;t be able to see it again.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted p-3 rounded-lg font-mono text-sm break-all flex items-start gap-2">
            <code className="flex-1">{apiKey.key}</code>
            <Button variant="ghost" size="sm" onClick={copyKey}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Store this key securely. It will only be shown once.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApiKeyRow({ apiKey, brands }: { apiKey: ApiKey; brands: { id: string; name: string }[] }) {
  const [revokeOpen, setRevokeOpen] = useState(false);
  const revokeKey = useRevokeApiKey();

  const handleRevoke = async () => {
    try {
      await revokeKey.mutateAsync(apiKey.id);
      toast.success('API key revoked');
      setRevokeOpen(false);
    } catch {
      toast.error('Failed to revoke API key');
    }
  };

  const getBrandNames = () => {
    if (apiKey.allBrands) return null;
    return apiKey.brandIds
      .map((id) => brands.find((b) => b.id === id)?.name || id)
      .join(', ');
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{apiKey.name}</p>
            <p className="text-sm text-muted-foreground font-mono">{apiKey.prefix}...</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {apiKey.allBrands ? (
          <Badge variant="secondary" className="gap-1">
            <Globe className="h-3 w-3" />
            All brands
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            {apiKey.brandIds.length} brand{apiKey.brandIds.length !== 1 ? 's' : ''}
          </Badge>
        )}
        {!apiKey.allBrands && (
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
            {getBrandNames()}
          </p>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(apiKey.createdAt)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(apiKey.lastUsedAt)}
      </TableCell>
      <TableCell>
        <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setRevokeOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to revoke &quot;{apiKey.name}&quot;? This action cannot
                be undone. Any applications using this key will lose access immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevoke}
                className="bg-red-600 hover:bg-red-700"
              >
                {revokeKey.isPending ? 'Revoking...' : 'Revoke Key'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export default function ApiKeysPage() {
  const { data: apiKeys, isLoading } = useApiKeys();
  const { data: brands } = useBrands();
  const [newKey, setNewKey] = useState<ApiKey | null>(null);

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for accessing the Dispatch Tickets API
          </p>
        </div>
        <CreateKeyDialog onSuccess={setNewKey} />
      </div>

      {newKey && <NewKeyDisplay apiKey={newKey} onClose={() => setNewKey(null)} />}

      <Card>
        <CardHeader>
          <CardTitle>Active Keys</CardTitle>
          <CardDescription>
            API keys are used to authenticate requests to the Dispatch Tickets API.
            Keys can be scoped to specific brands for security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : apiKeys && apiKeys.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <ApiKeyRow key={key.id} apiKey={key} brands={brands || []} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground">No API keys created yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first API key to start using the API
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Brand Scoping</CardTitle>
          <CardDescription>
            Limit API key access to specific brands for enhanced security
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">All brands:</strong> The key can access
            all workspaces under your account, including any created in the future.
          </p>
          <p>
            <strong className="text-foreground">Specific brands:</strong> The key can
            only access the selected brands. Useful for partner integrations or
            microservices that should only touch certain data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
