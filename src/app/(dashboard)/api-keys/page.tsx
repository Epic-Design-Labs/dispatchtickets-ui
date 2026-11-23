'use client';

import { useMemo, useState } from 'react';
import {
  BookOpen,
  Clock,
  Copy,
  Globe,
  KeyRound,
  Layers,
  Pencil,
  Plus,
  Search,
  ShieldX,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusTabs, type StatusTabDef } from '@/components/tickets/status-tabs';
import { BrandTile } from '@/components/brand-tile';
import {
  CreateApiKeyDialog,
  EditAccessDialog,
  NewKeyDialog,
  RevokeKeyDialog,
  type BrandOption,
} from '@/components/api-keys/api-key-dialogs';
import { useApiKeys } from '@/lib/hooks/use-api-keys';
import { useBrands } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { formatDate, formatDateTime, formatTimeAgo } from '@/lib/utils';
import type { ApiKey } from '@/types/api-key';

const STALE_DAYS = 60;
const DAY = 864e5;

type Filter = 'all' | 'wide' | 'unused';
type Sort = 'used' | 'created' | 'name';

const TABS: StatusTabDef[] = [
  { key: 'all', label: 'All keys', icon: Layers, tone: 'bg-secondary text-muted-foreground' },
  { key: 'wide', label: 'All-brand access', icon: Globe, tone: 'bg-warning-soft text-warning-foreground' },
  { key: 'unused', label: 'Unused', icon: Clock, tone: 'bg-secondary text-muted-foreground' },
];

/** Never used, or not in the last 60 days. */
function isUnused(k: ApiKey, now: number) {
  return !k.lastUsedAt || now - new Date(k.lastUsedAt).getTime() > STALE_DAYS * DAY;
}

function lastUsedLine(k: ApiKey) {
  return k.lastUsedAt ? `Last used ${formatTimeAgo(k.lastUsedAt)}` : 'Never used';
}

function matches(k: ApiKey, f: Filter, now: number) {
  if (f === 'wide') return k.allBrands;
  if (f === 'unused') return isUnused(k, now);
  return true;
}

function Access({ k, brandsById }: { k: ApiKey; brandsById: Map<string, BrandOption> }) {
  if (k.allBrands) {
    return (
      <span
        className="bg-warning-soft text-warning-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
        title="Can read and change tickets in every brand, including new ones"
      >
        <Globe className="h-3.5 w-3.5" />
        All brands
      </span>
    );
  }
  const live = k.brandIds.map((id) => brandsById.get(id)).filter((b): b is BrandOption => !!b);
  if (live.length === 0) {
    return <span className="text-muted-foreground text-sm">No brands</span>;
  }
  return (
    <span className="inline-flex max-w-[240px] items-center gap-2" title={live.map((b) => b.name).join(', ')}>
      <span className="flex -space-x-1.5">
        {live.slice(0, 3).map((b) => (
          <BrandTile key={b.id} name={b.name} iconUrl={b.iconUrl} className="ring-card ring-2" />
        ))}
      </span>
      <span className="truncate text-sm">
        {live[0].name}
        {live.length > 1 && <span className="text-muted-foreground"> +{live.length - 1}</span>}
      </span>
    </span>
  );
}

export default function ApiKeysPage() {
  const { session } = useAuth();
  const canManage = session?.orgRole === 'owner' || session?.orgRole === 'admin';
  const { data: keys, isLoading } = useApiKeys();
  const { data: brandList } = useBrands();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('used');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [editing, setEditing] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);

  const brands: BrandOption[] = useMemo(
    () =>
      [...(brandList ?? [])]
        .map((b) => ({ id: b.id, name: b.name, iconUrl: b.iconUrl }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [brandList],
  );
  const brandsById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  const all = useMemo(() => keys ?? [], [keys]);
  // eslint-disable-next-line react-hooks/purity -- a render-time clock is fine for "N days ago"
  const now = Date.now();
  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, all.filter((k) => matches(k, t.key as Filter, now)).length]),
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const text = (k: ApiKey) =>
      [
        k.name,
        k.prefix,
        k.allBrands ? 'all brands' : k.brandIds.map((id) => brandsById.get(id)?.name ?? '').join(' '),
      ]
        .join(' ')
        .toLowerCase();
    const time = (s: string | null) => (s ? new Date(s).getTime() : 0);
    return all
      .filter((k) => matches(k, filter, now) && (!q || text(k).includes(q)))
      .sort((a, b) =>
        sort === 'name'
          ? a.name.localeCompare(b.name)
          : sort === 'created'
            ? time(b.createdAt) - time(a.createdAt)
            : time(b.lastUsedAt) - time(a.lastUsedAt),
      );
  }, [all, filter, query, sort, brandsById, now]);

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="bg-card flex max-w-xl flex-col items-center rounded-xl border px-6 py-14 text-center">
          <ShieldX className="text-muted-foreground mb-4 h-10 w-10" />
          <h1 className="font-semibold">Only owners and admins can manage API keys</h1>
          <p className="text-muted-foreground mt-1 text-sm">Ask an owner or admin if you need a key.</p>
        </div>
      </div>
    );
  }

  const copyPrefix = async (prefix: string) => {
    try {
      await navigator.clipboard.writeText(prefix);
      toast.success('Key prefix copied. The full key is only shown when it’s created.');
    } catch {
      toast.error('Could not copy');
    }
  };

  const unusedCount = counts.unused ?? 0;

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API keys</h1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-3">
            Connect apps and scripts to the Dispatch Tickets API.
            <a
              href="https://dispatchtickets.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              <BookOpen className="h-3.5 w-3.5" />
              API docs
            </a>
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API key
        </Button>
      </div>

      {!isLoading && unusedCount > 0 && filter !== 'unused' && (
        <div className="bg-warning-soft text-warning-foreground flex flex-wrap items-center gap-3 rounded-lg px-4 py-2.5 text-sm">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            <b>
              {unusedCount} {unusedCount === 1 ? 'key hasn’t' : 'keys haven’t'}
            </b>{' '}
            been used in over {STALE_DAYS} days or never at all. Revoking keys you don&apos;t need keeps your
            data safer.
          </span>
          <Button size="sm" variant="outline" onClick={() => setFilter('unused')}>
            Review
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <StatusTabs
          tabs={TABS}
          defaultKey="all"
          value={filter}
          onSelect={(key) => setFilter(key as Filter)}
          counts={counts}
          loading={isLoading}
          ariaLabel="Filter API keys"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, key or brand"
              aria-label="Search API keys"
              className="w-[240px] pl-8"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-[150px]" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="used">Recently used</SelectItem>
              <SelectItem value="created">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs font-medium">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Access</th>
              <th className="px-4 py-2.5 font-medium">Last used</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
              <th className="w-[96px] px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td className="px-4 py-3" colSpan={5}>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-14 text-center">
                  {all.length === 0 ? (
                    <>
                      <KeyRound className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
                      <h3 className="font-semibold">No API keys yet</h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Create one to connect an app or script to your tickets.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold">
                        {query.trim() ? `No keys match “${query.trim()}”` : 'No keys here'}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {filter === 'unused' && !query.trim()
                          ? 'Every key has been used recently.'
                          : 'Try a different search or filter.'}
                      </p>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              visible.map((k) => {
                const stale = k.lastUsedAt && isUnused(k, now);
                return (
                  <tr key={k.id} className="group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                          <KeyRound className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{k.name}</div>
                          <button
                            type="button"
                            onClick={() => copyPrefix(k.prefix)}
                            className="text-muted-foreground hover:bg-muted hover:text-foreground -ml-1.5 inline-flex items-center gap-1.5 rounded px-1.5 font-mono text-xs"
                            title="Copy key prefix"
                          >
                            {k.prefix}••••
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Access k={k} brandsById={brandsById} />
                    </td>
                    <td className="px-4 py-3">
                      {!k.lastUsedAt ? (
                        <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                          Never used
                        </span>
                      ) : (
                        <span
                          className={stale ? 'text-warning-foreground inline-flex items-center gap-1' : ''}
                          title={formatDateTime(k.lastUsedAt)}
                        >
                          {stale && <Clock className="h-3.5 w-3.5" />}
                          {formatTimeAgo(k.lastUsedAt)}
                        </span>
                      )}
                    </td>
                    <td className="text-muted-foreground px-4 py-3" title={formatDateTime(k.createdAt)}>
                      {formatDate(k.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {k.isSystem ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground block text-right text-xs">Used by Dispatch</span>
                          </TooltipTrigger>
                          <TooltipContent>Dispatch&apos;s own features need this key, so it can&apos;t be changed here.</TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="flex justify-end gap-0.5 opacity-60 group-focus-within:opacity-100 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditing(k)}
                            aria-label={`Change access for ${k.name}`}
                            title="Change access"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-danger-soft hover:text-destructive h-8 w-8"
                            onClick={() => setRevoking(k)}
                            aria-label={`Revoke ${k.name}`}
                            title="Revoke"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CreateApiKeyDialog
        open={creating}
        onOpenChange={setCreating}
        brands={brands}
        onCreated={(key) => {
          setCreating(false);
          setFilter('all');
          setQuery('');
          setSort('created');
          setNewKey(key);
        }}
      />
      <NewKeyDialog apiKey={newKey} onClose={() => setNewKey(null)} />
      <EditAccessDialog apiKey={editing} onClose={() => setEditing(null)} brands={brands} />
      <RevokeKeyDialog
        apiKey={revoking}
        onClose={() => setRevoking(null)}
        lastUsedText={revoking ? lastUsedLine(revoking) : ''}
      />
    </div>
  );
}
