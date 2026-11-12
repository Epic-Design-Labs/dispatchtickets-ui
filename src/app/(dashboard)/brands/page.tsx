'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBrands, useCreateBrand, useUsage, useDashboardStats } from '@/lib/hooks';
import { Header } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { formatDate, cn } from '@/lib/utils';
import { BrandTile } from '@/components/brand-tile';
import { useFavoriteBrands } from '@/lib/ui-prefs';
import { toast } from 'sonner';
import { Plus, Star, Inbox } from 'lucide-react';

export default function BrandsPage() {
  const router = useRouter();
  const { data: brands, isLoading, error } = useBrands();
  const { data: usageData } = useUsage();
  // The same per-brand open+pending figures the sidebar shows, so a brand's
  // count agrees wherever you read it.
  const { data: stats } = useDashboardStats();
  const { isFavorite, toggle: toggleFavorite } = useFavoriteBrands();
  const createBrand = useCreateBrand();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  // Auto-select when only one brand exists
  useEffect(() => {
    if (!isLoading && brands && brands.length === 1) {
      router.replace(`/brands/${brands[0].id}/tickets`);
    }
  }, [isLoading, brands, router]);

  // Check if user is at their brand limit
  const isAtBrandLimit = usageData?.brandLimit !== null &&
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
      // Redirect to getting started page for the new brand
      router.push(`/brands/${brand.id}/getting-started`);
    } catch (error) {
      toast.error('Failed to create brand');
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="Brands" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your Brands</h2>
            <p className="text-muted-foreground">
              Select a brand to view and manage tickets
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    disabled={isAtBrandLimit}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Brand
                  </Button>
                </span>
              </TooltipTrigger>
              {isAtBrandLimit && (
                <TooltipContent>
                  <p>You&apos;ve reached your plan&apos;s brand limit ({usageData?.brandLimit}).</p>
                  <p className="text-zinc-400">Upgrade your plan to create more brands.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {isLoading && (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl border p-[18px] shadow-sm">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-[11px]" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="mt-3.5 border-t pt-3">
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Failed to load brands. Please try again.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && brands && (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {brands
              .slice()
              // Favourites first, then alphabetical -- the same order as the
              // sidebar, so the two lists never disagree about where a brand is.
              .sort((a, b) => {
                const fa = Number(isFavorite(b.id)) - Number(isFavorite(a.id));
                return fa !== 0 ? fa : a.name.localeCompare(b.name);
              })
              .map((brand) => {
                const brandStats = stats?.byBrand?.[brand.id];
                const activeCount = brandStats ? brandStats.open + brandStats.pending : 0;
                const favorite = isFavorite(brand.id);
                return (
                  <div key={brand.id} className="group/brand relative">
                    <Link
                      href={`/brands/${brand.id}`}
                      className={cn(
                        'bg-card flex h-full flex-col gap-3.5 rounded-xl border p-[18px] shadow-sm',
                        'hover:border-brand-softer transition-[border-color,box-shadow]',
                        'hover:shadow-[0_4px_16px_rgba(124,77,255,0.08)]'
                      )}
                    >
                      {/* pr-7 keeps a long name clear of the star above it. */}
                      <div className="flex items-center gap-3 pr-7">
                        <BrandTile name={brand.name} iconUrl={brand.iconUrl} size="xl" />
                        <div className="min-w-0">
                          <h3 className="truncate text-[15px] font-semibold">{brand.name}</h3>
                          <p className="text-subtle mt-0.5 truncate text-xs">{brand.slug}</p>
                        </div>
                      </div>
                      <div className="text-muted-foreground mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs">
                        <span className="truncate">Created {formatDate(brand.createdAt)}</span>
                        {activeCount > 0 ? (
                          <span className="bg-brand-soft text-brand-strong shrink-0 rounded-md px-2 py-0.5 font-semibold tabular-nums">
                            {activeCount} active
                          </span>
                        ) : (
                          <span className="bg-secondary text-subtle shrink-0 rounded-md px-2 py-0.5">
                            None active
                          </span>
                        )}
                      </div>
                    </Link>
                    {/* A sibling of the link, not a child: a button cannot live
                        inside an anchor, and the two would fight for the click. */}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(brand.id)}
                      aria-pressed={favorite}
                      aria-label={favorite ? `Unfavourite ${brand.name}` : `Favourite ${brand.name}`}
                      title={favorite ? 'Remove from favourites' : 'Add to favourites'}
                      className={cn(
                        'absolute top-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-md transition',
                        'hover:bg-muted focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                        // An unstarred brand only shows its star on hover or
                        // keyboard focus; a starred one always shows it, since
                        // that star is now information about the brand.
                        favorite
                          ? 'text-warning opacity-100'
                          : 'text-subtle opacity-0 group-hover/brand:opacity-100 focus-visible:opacity-100'
                      )}
                    >
                      <Star className={cn('h-4 w-4', favorite && 'fill-current')} />
                    </button>
                  </div>
                );
              })}

            {brands.length === 0 && (
              <div className="bg-card col-span-full flex flex-col items-center justify-center rounded-xl border px-5 py-14 text-center">
                <span className="bg-brand-soft text-brand mb-3.5 grid h-12 w-12 place-items-center rounded-[14px]">
                  <Inbox className="h-6 w-6" />
                </span>
                <p className="text-base font-semibold">No brands yet</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  A brand is an isolated container of tickets, with its own email identity.
                </p>
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)} disabled={isAtBrandLimit}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first brand
                </Button>
              </div>
            )}
          </div>
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
    </div>
  );
}
