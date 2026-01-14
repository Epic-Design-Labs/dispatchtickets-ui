'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrand, useUpdateBrand } from '@/lib/hooks';
import { toast } from 'sonner';
import { Plus, Trash2, Globe, ExternalLink } from 'lucide-react';

export default function PortalSettingsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const { data: brand, isLoading } = useBrand(brandId);
  const updateBrand = useUpdateBrand(brandId);

  const [origins, setOrigins] = useState<string[]>([]);
  const [newOrigin, setNewOrigin] = useState('');

  // Initialize form with brand data
  useEffect(() => {
    if (brand?.portalOrigins) {
      setOrigins(brand.portalOrigins);
    }
  }, [brand]);

  const validateOrigin = (origin: string): string | null => {
    if (!origin.trim()) {
      return 'Origin cannot be empty';
    }

    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return 'Origin must use http or https protocol';
      }
      // Origin should not have a path (except /)
      if (url.pathname !== '/' && url.pathname !== '') {
        return 'Origin should not include a path';
      }
      return null;
    } catch {
      return 'Invalid URL format. Example: https://example.com';
    }
  };

  const normalizeOrigin = (origin: string): string => {
    const url = new URL(origin);
    // Return origin without trailing slash
    return url.origin;
  };

  const handleAddOrigin = () => {
    const error = validateOrigin(newOrigin);
    if (error) {
      toast.error(error);
      return;
    }

    const normalized = normalizeOrigin(newOrigin);

    if (origins.includes(normalized)) {
      toast.error('This origin is already in the list');
      return;
    }

    setOrigins([...origins, normalized]);
    setNewOrigin('');
  };

  const handleRemoveOrigin = (originToRemove: string) => {
    setOrigins(origins.filter((o) => o !== originToRemove));
  };

  const handleSave = async () => {
    try {
      await updateBrand.mutateAsync({ portalOrigins: origins });
      toast.success('Portal settings saved');
    } catch {
      toast.error('Failed to save portal settings');
    }
  };

  const hasChanges = JSON.stringify(origins) !== JSON.stringify(brand?.portalOrigins || []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Customer Portal</h2>
        <p className="text-muted-foreground">
          Configure the customer-facing portal for this brand
        </p>
      </div>

      {/* Portal Origins */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Allowed Origins</CardTitle>
              <CardDescription>
                Domains that can embed the customer portal and access the portal API
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Add Origin</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com"
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOrigin();
                  }
                }}
              />
              <Button onClick={handleAddOrigin} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the full origin URL (e.g., https://app.yoursite.com). Do not include paths.
            </p>
          </div>

          {origins.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border rounded-lg">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No origins configured</p>
              <p className="text-xs">Add an origin to enable portal access from external sites</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Configured Origins</Label>
              <div className="space-y-2">
                {origins.map((origin) => (
                  <div
                    key={origin}
                    className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg"
                  >
                    <code className="text-sm">{origin}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveOrigin(origin)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
            </p>
            <Button onClick={handleSave} disabled={updateBrand.isPending || !hasChanges}>
              {updateBrand.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Link */}
      <Card>
        <CardHeader>
          <CardTitle>Portal Integration</CardTitle>
          <CardDescription>
            Learn how to integrate the customer portal into your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            The customer portal allows your users to view and respond to their support tickets
            directly from your website. Use our SDK or REST API to generate portal tokens and
            embed the portal experience.
          </p>
          <Button variant="outline" asChild>
            <a
              href="https://dispatchtickets.com/docs/portal"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Documentation
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
