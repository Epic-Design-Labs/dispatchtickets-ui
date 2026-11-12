'use client';

import { useMemo, useState } from 'react';
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
import { Plus, Search, Star } from 'lucide-react';
import { BRAND_NAV_TABS } from './brand-nav';
import {
  SidebarSection,
  SidebarSectionHeader,
  NavItem,
  useSidebarIsCollapsed,
} from './sidebar-nav';
import { useFavoriteBrands } from '@/lib/ui-prefs';
import { BrandTile } from '@/components/brand-tile';

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

  const collapsed = useSidebarIsCollapsed();
  const { isFavorite, toggle: toggleFavorite } = useFavoriteBrands();

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

  const matchingBrands = useMemo(() => {
    if (!showFilter || !filter.trim()) return sortedBrands;
    const needle = filter.trim().toLowerCase();
    return sortedBrands.filter((b) => b.name.toLowerCase().includes(needle));
  }, [sortedBrands, filter, showFilter]);

  // Starred brands float to the top, alphabetical within each group. The
  // split is kept so the list can draw a rule between them -- without it,
  // "why is Northwind above Acme" has no visible answer.
  const { favoriteBrands, otherBrands } = useMemo(
    () => ({
      favoriteBrands: matchingBrands.filter((b) => isFavorite(b.id)),
      otherBrands: matchingBrands.filter((b) => !isFavorite(b.id)),
    }),
    [matchingBrands, isFavorite]
  );
  const visibleBrands = useMemo(
    () => [...favoriteBrands, ...otherBrands],
    [favoriteBrands, otherBrands]
  );

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
      <SidebarSection>
        <SidebarSectionHeader
          action={
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
          }
        >
          Brands
          {sortedBrands.length > 0 && (
            <span className="text-subtle ml-1.5 font-normal tracking-normal">
              {sortedBrands.length}
            </span>
          )}
        </SidebarSectionHeader>

        {showFilter && !collapsed && (
          <div className="relative mb-2 px-0.5">
            <Search className="text-subtle absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter brands"
              aria-label="Filter brands"
              className="h-8 pl-8 text-[13.5px]"
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
              'space-y-0.5',
              // Past the filter threshold the list scrolls instead of pushing
              // the Workspace section below the fold. Five rows, like the
              // design. The negative margin plus matching padding keeps the
              // active row's accent bar INSIDE the scroll box -- at -left-3 it
              // would otherwise be clipped by the overflow.
              showFilter &&
                (collapsed
                  ? '-mx-2.5 max-h-[12.5rem] overflow-y-auto overscroll-contain px-2.5'
                  : '-mx-3 max-h-[11.25rem] overflow-y-auto overscroll-contain px-3')
            )}
          >
            {visibleBrands.map((brand, index) => {
              const isActive = brand.id === currentBrandId;
              const brandStats = stats?.byBrand?.[brand.id];
              // "Active" matches the All Active queue above: open + pending.
              const activeCount = brandStats
                ? brandStats.open + brandStats.pending
                : 0;
              const favorite = isFavorite(brand.id);
              // The rule goes above the first unstarred brand, and only when
              // there is something on both sides of it.
              const startsRest =
                !collapsed && index === favoriteBrands.length && favoriteBrands.length > 0;

              const item = (
                <NavItem
                  href={`/brands/${brand.id}/${currentSection}`}
                  active={isActive}
                  icon={<BrandTile name={brand.name} iconUrl={brand.iconUrl} size="sm" />}
                  label={brand.name}
                  count={activeCount}
                  // The star is a sibling, not an overlay: a <button> cannot
                  // live inside the <a>, and floating it over the row put it
                  // on top of the count.
                  className={collapsed ? undefined : 'min-w-0 flex-1'}
                  title={
                    brandStats
                      ? `${brand.name} · ${brandStats.open} open · ${brandStats.pending} pending`
                      : brand.name
                  }
                />
              );

              return (
                <div key={brand.id}>
                  {startsRest && <div className="bg-border mx-2.5 my-1 h-px" role="separator" />}
                  {collapsed ? (
                    item
                  ) : (
                    <div className="group/brand flex items-center">
                      {item}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(brand.id)}
                        aria-pressed={favorite}
                        aria-label={
                          favorite
                            ? `Remove ${brand.name} from favourites`
                            : `Add ${brand.name} to favourites`
                        }
                        title={favorite ? 'Remove from favourites' : 'Add to favourites'}
                        className={cn(
                          'grid h-6 w-6 shrink-0 place-items-center rounded-md transition-opacity',
                          'hover:bg-muted focus-visible:ring-ring/50 focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:outline-none',
                          favorite
                            ? 'text-warning opacity-100'
                            : 'text-subtle opacity-0 group-hover/brand:opacity-100'
                        )}
                      >
                        <Star className={cn('h-3.5 w-3.5', favorite && 'fill-current')} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {visibleBrands.length === 0 && (
              <p className="text-muted-foreground px-2.5 py-1.5 text-sm">
                {sortedBrands.length === 0
                  ? 'No brands found'
                  : 'No brands match that filter'}
              </p>
            )}
          </nav>
        )}
      </SidebarSection>
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
