'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { BrandTile } from '@/components/brand-tile';
import { useCreateApiKey, useRevokeApiKey, useUpdateApiKeyScope } from '@/lib/hooks/use-api-keys';
import { cn } from '@/lib/utils';
import type { ApiKey } from '@/types/api-key';

export interface BrandOption {
  id: string;
  name: string;
  iconUrl?: string | null;
}

interface Access {
  allBrands: boolean;
  brandIds: string[];
}

/** The server's message when it has one (e.g. "Pick at least one brand"). */
function errorText(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof msg === 'string' ? msg : fallback;
}

function AccessField({
  value,
  onChange,
  brands,
  showError,
}: {
  value: Access;
  onChange: (v: Access) => void;
  brands: BrandOption[];
  showError: boolean;
}) {
  const toggle = (id: string) =>
    onChange({
      ...value,
      brandIds: value.brandIds.includes(id)
        ? value.brandIds.filter((b) => b !== id)
        : [...value.brandIds, id],
    });

  return (
    <div className="space-y-2">
      <Label>Access</Label>
      <RadioGroup
        value={value.allBrands ? 'all' : 'some'}
        onValueChange={(v) => onChange({ ...value, allBrands: v === 'all' })}
        className="grid gap-2 sm:grid-cols-2"
      >
        {[
          { v: 'some', title: 'Selected brands', hint: 'Recommended. Only touches the brands you pick.' },
          { v: 'all', title: 'All brands', hint: 'Every brand, including ones created later.' },
        ].map((o) => (
          <label
            key={o.v}
            htmlFor={`access-${o.v}`}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
              (value.allBrands ? 'all' : 'some') === o.v && 'border-primary bg-accent/40',
            )}
          >
            <RadioGroupItem value={o.v} id={`access-${o.v}`} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">{o.title}</span>
              <span className="text-muted-foreground block text-xs">{o.hint}</span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {!value.allBrands && (
        <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
          {brands.map((b) => (
            <label
              key={b.id}
              className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <Checkbox checked={value.brandIds.includes(b.id)} onCheckedChange={() => toggle(b.id)} />
              <BrandTile name={b.name} iconUrl={b.iconUrl} />
              <span className="truncate">{b.name}</span>
            </label>
          ))}
        </div>
      )}
      {value.allBrands && (
        <p className="text-warning-foreground text-sm">
          This key can read and change every brand&apos;s tickets, including brands you add later.
        </p>
      )}
      {showError && !value.allBrands && value.brandIds.length === 0 && (
        <p className="text-destructive text-sm">Pick at least one brand.</p>
      )}
    </div>
  );
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  brands,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: BrandOption[];
  onCreated: (key: ApiKey) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && <CreateBody brands={brands} onCreated={onCreated} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateBody({
  brands,
  onCreated,
  onCancel,
}: {
  brands: BrandOption[];
  onCreated: (key: ApiKey) => void;
  onCancel: () => void;
}) {
  const create = useCreateApiKey();
  const [name, setName] = useState('');
  const [access, setAccess] = useState<Access>({ allBrands: false, brandIds: [] });
  const [tried, setTried] = useState(false);

  const nameMissing = !name.trim();
  const brandsMissing = !access.allBrands && access.brandIds.length === 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (nameMissing || brandsMissing) return;
    try {
      const key = await create.mutateAsync({
        name: name.trim(),
        allBrands: access.allBrands,
        brandIds: access.allBrands ? undefined : access.brandIds,
      });
      onCreated(key);
    } catch (err) {
      toast.error(errorText(err, 'Could not create the key'));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>Create API key</DialogTitle>
        <DialogDescription>Give it a name you&apos;ll recognize later, like the app that uses it.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="keyName">Name</Label>
        <Input
          id="keyName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Zapier, Website contact form"
          autoComplete="off"
          maxLength={100}
          autoFocus
        />
        {tried && nameMissing && <p className="text-destructive text-sm">Give the key a name.</p>}
      </div>
      <AccessField value={access} onChange={setAccess} brands={brands} showError={tried} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create key'}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Shown once, straight after creation: the only time the full key exists in the UI. */
export function NewKeyDialog({ apiKey, onClose }: { apiKey: ApiKey | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!apiKey?.key) return;
    try {
      await navigator.clipboard.writeText(apiKey.key);
      setCopied(true);
      toast.success('Key copied');
    } catch {
      toast.error('Could not copy. Select the key and copy it by hand.');
    }
  };

  return (
    <Dialog
      open={!!apiKey}
      onOpenChange={(o) => {
        if (!o) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Copy your new key</DialogTitle>
          <DialogDescription>For security, this is the only time you&apos;ll see the full key.</DialogDescription>
        </DialogHeader>
        <div className="bg-muted flex items-center gap-2 rounded-lg border p-3">
          <code className="min-w-0 flex-1 font-mono text-sm break-all">{apiKey?.key}</code>
          <Button type="button" size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <div className="bg-warning-soft text-warning-foreground flex gap-2 rounded-lg p-3 text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Store it somewhere safe, like a password manager or your app&apos;s environment variables. If you
            lose it, revoke it and create a new one.
          </span>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              toast.success(`${apiKey?.name} is ready to use`);
              setCopied(false);
              onClose();
            }}
          >
            I&apos;ve saved it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditAccessDialog({
  apiKey,
  onClose,
  brands,
}: {
  apiKey: ApiKey | null;
  onClose: () => void;
  brands: BrandOption[];
}) {
  return (
    <Dialog open={!!apiKey} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {apiKey && <EditBody key={apiKey.id} apiKey={apiKey} brands={brands} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EditBody({ apiKey, brands, onClose }: { apiKey: ApiKey; brands: BrandOption[]; onClose: () => void }) {
  const update = useUpdateApiKeyScope();
  // A scoped key may still list a brand that was since deleted; keep only live ones.
  const live = new Set(brands.map((b) => b.id));
  const [access, setAccess] = useState<Access>({
    allBrands: apiKey.allBrands,
    brandIds: apiKey.brandIds.filter((id) => live.has(id)),
  });
  const [tried, setTried] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!access.allBrands && access.brandIds.length === 0) return;
    try {
      await update.mutateAsync({
        keyId: apiKey.id,
        data: access.allBrands ? { allBrands: true } : { allBrands: false, brandIds: access.brandIds },
      });
      const n = access.brandIds.length;
      toast.success(
        `${apiKey.name} now has access to ${access.allBrands ? 'all brands' : `${n} brand${n === 1 ? '' : 's'}`}`,
      );
      onClose();
    } catch (err) {
      toast.error(errorText(err, 'Could not change access'));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>Access for {apiKey.name}</DialogTitle>
        <DialogDescription>Changes apply right away to requests using this key.</DialogDescription>
      </DialogHeader>
      <AccessField value={access} onChange={setAccess} brands={brands} showError={tried} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save access'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RevokeKeyDialog({
  apiKey,
  onClose,
  lastUsedText,
}: {
  apiKey: ApiKey | null;
  onClose: () => void;
  lastUsedText: string;
}) {
  const revoke = useRevokeApiKey();
  const confirm = async () => {
    if (!apiKey) return;
    try {
      await revoke.mutateAsync(apiKey.id);
      toast.success(`${apiKey.name} revoked`);
      onClose();
    } catch (err) {
      toast.error(errorText(err, 'Could not revoke the key'));
    }
  };

  return (
    <AlertDialog open={!!apiKey} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke “{apiKey?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Apps using this key will stop working immediately. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
          <span className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-md">
            <KeyRound className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-mono">{apiKey?.prefix}••••</span>
            <span className="text-muted-foreground">{lastUsedText}</span>
          </span>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={revoke.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void confirm();
            }}
            disabled={revoke.isPending}
            className={buttonVariants({ variant: 'destructive' })}
          >
            {revoke.isPending ? 'Revoking…' : 'Revoke key'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
