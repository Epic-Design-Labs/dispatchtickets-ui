'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useBrands, useCreateBrand, useUsage } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export function BrandSwitcher() {
  const router = useRouter();
  const params = useParams();
  const currentBrandId = params.brandId as string | undefined;
  const { data: brands, isLoading } = useBrands();
  const { data: usageData } = useUsage();
  const createBrand = useCreateBrand();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  const currentBrand = brands?.find((b) => b.id === currentBrandId);

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
      router.push(`/brands/${brand.id}`);
    } catch (error) {
      toast.error('Failed to create brand');
    }
  };

  if (isLoading) {
    return <Skeleton className="h-9 w-full" />;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="truncate">
              {currentBrand?.name || 'Select brand'}
            </span>
            <svg
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Brands</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={isAtBrandLimit}
                      onClick={(e) => {
                        e.preventDefault();
                        setCreateDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {isAtBrandLimit && (
                  <TooltipContent>
                    <p>Brand limit reached ({usageData?.brandLimit})</p>
                    <p className="text-zinc-400 text-xs">Upgrade to create more</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {brands?.map((brand) => (
            <DropdownMenuItem
              key={brand.id}
              className="cursor-pointer flex items-center justify-between"
              onClick={() => router.push(`/brands/${brand.id}`)}
            >
              <span className="truncate">{brand.name}</span>
              {brand.id === currentBrandId && (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </DropdownMenuItem>
          ))}
          {(!brands || brands.length === 0) && (
            <DropdownMenuItem disabled>No brands found</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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

// Alias for backward compatibility
export const WorkspaceSwitcher = BrandSwitcher;
