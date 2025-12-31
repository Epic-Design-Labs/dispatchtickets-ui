'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBrands, useCreateBrand } from '@/lib/hooks';
import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export default function BrandsPage() {
  const router = useRouter();
  const { data: brands, isLoading, error } = useBrands();
  const createBrand = useCreateBrand();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

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
      router.push(`/workspaces/${brand.id}`);
    } catch (error) {
      toast.error('Failed to create brand');
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="Brands" />
      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your Brands</h2>
            <p className="text-muted-foreground">
              Select a brand to view and manage tickets
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Brand
          </Button>
        </div>

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <Link key={brand.id} href={`/workspaces/${brand.id}`}>
                <Card className="cursor-pointer transition-colors hover:bg-accent">
                  <CardHeader>
                    <CardTitle>{brand.name}</CardTitle>
                    <CardDescription>{brand.slug}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(brand.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {brands.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <svg
                    className="mb-4 h-12 w-12 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="text-lg font-medium">No brands found</p>
                  <p className="text-muted-foreground">
                    Click the button above to create your first brand
                  </p>
                </CardContent>
              </Card>
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
