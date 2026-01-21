'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBrands } from '@/lib/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

export default function GettingStartedPage() {
  const router = useRouter();
  const { data: brands, isLoading } = useBrands();

  // If user has brands, redirect to the first brand's getting started page
  useEffect(() => {
    if (!isLoading && brands && brands.length > 0) {
      router.replace(`/brands/${brands[0].id}/getting-started`);
    }
  }, [brands, isLoading, router]);

  // Show loading while checking for brands
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If redirecting to brand getting started, show loading
  if (brands && brands.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No brands - show create first brand message
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to Dispatch Tickets</h1>
          <p className="text-muted-foreground text-lg">
            Get started by creating your first brand
          </p>
        </div>

        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Create Your First Brand</h2>
              <p className="text-muted-foreground max-w-md">
                A brand is a workspace for managing support tickets. Each brand has its own
                email address, team members, and settings.
              </p>
            </div>
            <Button size="lg" onClick={() => router.push('/brands')}>
              <Plus className="mr-2 h-5 w-5" />
              Create Brand
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
