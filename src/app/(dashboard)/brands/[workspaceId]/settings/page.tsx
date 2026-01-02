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
import { Copy } from 'lucide-react';

export default function SettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const { data: brand, isLoading } = useBrand(workspaceId);
  const updateBrand = useUpdateBrand(workspaceId);

  const [name, setName] = useState('');
  const [ticketPrefix, setTicketPrefix] = useState('');
  const [nextTicketNumber, setNextTicketNumber] = useState<number>(1000);

  // Brand identity state
  const [url, setUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');

  // Initialize form with brand data
  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setTicketPrefix(brand.ticketPrefix || '');
      setNextTicketNumber(brand.nextTicketNumber || 1000);
      setUrl(brand.url || '');
      setIconUrl(brand.iconUrl || '');
    }
  }, [brand]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Brand name is required');
      return;
    }

    if (!ticketPrefix.trim()) {
      toast.error('Ticket prefix is required');
      return;
    }

    if (!/^[A-Z0-9]+$/i.test(ticketPrefix)) {
      toast.error('Ticket prefix must contain only letters and numbers');
      return;
    }

    if (nextTicketNumber < (brand?.nextTicketNumber || 1)) {
      toast.error('Next ticket number cannot be lower than current value');
      return;
    }

    try {
      await updateBrand.mutateAsync({
        name: name.trim(),
        ticketPrefix: ticketPrefix.trim().toUpperCase(),
        ...(nextTicketNumber !== brand?.nextTicketNumber && {
          ticketNumberStart: nextTicketNumber,
        }),
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleSaveIdentity = async () => {
    try {
      await updateBrand.mutateAsync({
        url: url.trim() || undefined,
        iconUrl: iconUrl.trim() || undefined,
      });
      toast.success('Brand identity saved');
    } catch {
      toast.error('Failed to save brand identity');
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
    <div className="grid gap-6 lg:grid-cols-2">
        {/* Brand Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Settings</CardTitle>
            <CardDescription>General brand configuration</CardDescription>
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
                  {ticketPrefix || 'XXX'}-{nextTicketNumber}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Prefix for public ticket IDs (e.g., EDL-1001)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextTicketNumber">Next Ticket Number</Label>
              <Input
                id="nextTicketNumber"
                type="number"
                value={nextTicketNumber}
                onChange={(e) => setNextTicketNumber(parseInt(e.target.value) || 1)}
                className="w-32"
                min={brand?.nextTicketNumber || 1}
              />
              <p className="text-sm text-muted-foreground">
                The next ticket created will use this number.
              </p>
            </div>

            <Separator />

            <Button onClick={handleSave} disabled={updateBrand.isPending}>
              {updateBrand.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Brand Identity */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Identity</CardTitle>
            <CardDescription>Website URL and icon for your brand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Your brand's website URL. We'll automatically fetch the favicon.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="iconUrl">Icon URL</Label>
              <div className="flex items-center gap-3">
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt="Brand icon"
                    className="h-8 w-8 rounded object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <Input
                  id="iconUrl"
                  type="url"
                  placeholder="https://example.com/favicon.ico"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Custom icon URL (leave empty to auto-fetch from website)
              </p>
            </div>

            <Separator />

            <Button onClick={handleSaveIdentity} disabled={updateBrand.isPending}>
              {updateBrand.isPending ? 'Saving...' : 'Save Brand Identity'}
            </Button>
          </CardContent>
        </Card>

        {/* Brand ID */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Brand ID</CardTitle>
            <CardDescription>Unique identifier for API integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
              <code className="flex-1 text-sm text-muted-foreground">{workspaceId}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard(workspaceId)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
