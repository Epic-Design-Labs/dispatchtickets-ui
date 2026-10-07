'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useBrands, useCreateBrand, useUsage, useDashboardStats } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { BRAND_NAV_TABS } from './brand-nav';

/**
 * Above this many brands the flat list becomes a filtered, scrollable region
 * so it can't push the org and account nav below the fold.
 */
const FILTER_THRESHOLD = 8;

/** Sections we can carry across a brand switch (see currentSection below). */
const SWITCHABLE_SECTIONS = new Set<string>([
  ...BRAND_NAV_TABS.map((t) => t.segment),
  'settings',
  'getting-started',
]);

export function BrandList() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const currentBrandId = params.brandId as string | undefined;
  const { data: brands, isLoading } = useBrands();
  const { data: usageData } = useUsage();
  const { data: stats } = useDashboardStats();
  const createBrand = useCreateBrand();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [filter, setFilter] = useState('');

  // Switching brands keeps you in the same section — on Acme's Contacts and
  // clicking Northwind lands on Northwind's Contacts, not back at its tickets.
  // Record-level segments (a ticket id, a contact id) drop back to the section.
  const currentSection = useMemo(() => {
    if (!currentBrandId) return 'tickets';
    const base = `/brands/${currentBrandId}`;
    if (!pathname.startsWith(base)) return 'tickets';
    const segment = pathname.slice(base.length + 1).split('/')[0];
    return SWITCHABLE_SECTIONS.has(segment) ? segment : 'tickets';
  }, [currentBrandId, pathname]);

  const sortedBrands = useMemo(
    () => brands?.slice().sort((a, b) => a.name.localeCompare(b.name)) ?? [],
    [brands]
  );

  const showFilter = sortedBrands.length > FILTER_THRESHOLD;

  const visibleBrands = useMemo(() => {
    if (!showFilter || !filter.trim()) return sortedBrands;
    const needle = filter.trim().toLowerCase();
    return sortedBrands.filter((b) => b.name.toLowerCase().includes(needle));
  }, [sortedBrands, filter, showFilter]);

  // Check if user is at their brand limit
  const isAtBrandLimit =
    usageData?.brandLimit !== null &&
    usageData?.brandLimit !== -1 &&
    usageData?.brandCount !== undefined &&
    usageData.brandCount >= usageData.brandLimit;

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error('Please enter a brand name');
      return;
    }

    try {
      const name = newBrandName.trim();
      // Generate slug from name: lowercase, replace spaces with hyphens, remove special chars
      const baseSlug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      // Add random suffix to avoid collisions
      const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

      const brand = await createBrand.mutateAsync({ name, slug });
      toast.success('Brand created successfully');
      setCreateDialogOpen(false);
      setNewBrandName('');
      router.push(`/brands/${brand.id}`);
    } catch {
      toast.error('Failed to create brand');
    }
  };

  return (
    <>
      <div className="px-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Brands
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={isAtBrandLimit}
                    aria-label="Create brand"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {isAtBrandLimit ? (
                  <>
                    <p>Brand limit reached ({usageData?.brandLimit})</p>
                    <p className="text-xs text-zinc-400">Upgrade to create more</p>
                  </>
                ) : (
                  <p>Create brand</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {showFilter && (
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`Filter ${sortedBrands.length} brands...`}
              aria-label="Filter brands"
              className="h-8 pl-7 text-sm"
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-1 px-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : (
          <nav
            className={cn(
              'space-y-1',
              showFilter && 'max-h-64 overflow-y-auto'
            )}
          >
            {visibleBrands.map((brand) => {
              const isActive = brand.id === currentBrandId;
              const brandStats = stats?.byBrand?.[brand.id];
              // "Active" matches the All Active queue above: open + pending.
              const activeCount = brandStats
                ? brandStats.open + brandStats.pending
                : 0;

              return (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.id}/${currentSection}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-secondary font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="truncate">{brand.name}</span>
                  {activeCount > 0 && (
                    <span
                      className="ml-auto shrink-0 text-xs opacity-70"
                      title={`${brandStats!.open} open · ${brandStats!.pending} pending`}
                    >
                      {activeCount}
                    </span>
                  )}
                </Link>
              );
            })}

            {visibleBrands.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                {sortedBrands.length === 0
                  ? 'No brands found'
                  : 'No brands match that filter'}
              </p>
            )}
          </nav>
        )}
      </div>

      {/* Create Brand Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Brand</DialogTitle>
            <DialogDescription>
              Create a new brand to organize your tickets.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Brand Name</Label>
              <Input
                id="name"
                placeholder="e.g., My Company"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateBrand();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBrand} disabled={createBrand.isPending}>
              {createBrand.isPending ? 'Creating...' : 'Create Brand'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
