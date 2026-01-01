'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useBrand, useUpdateBrand } from '@/lib/hooks';
import { toast } from 'sonner';

export default function SettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const { data: brand, isLoading } = useBrand(workspaceId);
  const updateBrand = useUpdateBrand(workspaceId);

  const [name, setName] = useState('');
  const [ticketPrefix, setTicketPrefix] = useState('');

  // Initialize form with brand data
  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setTicketPrefix(brand.ticketPrefix || '');
    }
  }, [brand]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Brand name is required');
      return;
    }

    if (!ticketPrefix.trim()) {
      toast.error('Ticket prefix is required');
      return;
    }

    // Validate ticket prefix format
    if (!/^[A-Z0-9]+$/i.test(ticketPrefix)) {
      toast.error('Ticket prefix must contain only letters and numbers');
      return;
    }

    try {
      await updateBrand.mutateAsync({
        name: name.trim(),
        ticketPrefix: ticketPrefix.trim().toUpperCase(),
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Manage brand configuration and preferences
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Brand Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Settings</CardTitle>
            <CardDescription>
              General brand configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Brand Name</Label>
              <Input
                id="name"
                placeholder="e.g., Epic Design Labs"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                The display name for this brand
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketPrefix">Ticket Prefix</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="ticketPrefix"
                  placeholder="e.g., EDL"
                  value={ticketPrefix}
                  onChange={(e) => setTicketPrefix(e.target.value.toUpperCase())}
                  className="w-32"
                  maxLength={10}
                />
                <span className="text-muted-foreground">
                  → {ticketPrefix || 'XXX'}-{brand?.nextTicketNumber || 1000}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Prefix for public ticket IDs (e.g., EDL-1001). Cannot be changed after tickets are created.
              </p>
            </div>

            <Separator />

            <Button onClick={handleSave} disabled={updateBrand.isPending}>
              {updateBrand.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Inbound Email */}
        <Card>
          <CardHeader>
            <CardTitle>Inbound Email</CardTitle>
            <CardDescription>
              Email address for creating tickets via email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Inbound Address</p>
              <code className="text-sm text-muted-foreground">
                {workspaceId}@inbound.dispatchtickets.com
              </code>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Forward emails to this address to automatically create tickets
            </p>
          </CardContent>
        </Card>

        {/* Brand ID */}
        <Card>
          <CardHeader>
            <CardTitle>Brand ID</CardTitle>
            <CardDescription>
              Unique identifier for API integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4">
              <code className="text-sm text-muted-foreground">{workspaceId}</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
