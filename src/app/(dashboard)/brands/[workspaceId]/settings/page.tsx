'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useBrand, useUpdateBrand } from '@/lib/hooks';
import { toast } from 'sonner';

export default function SettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const { data: brand, isLoading } = useBrand(workspaceId);
  const updateBrand = useUpdateBrand(workspaceId);

  const [name, setName] = useState('');
  const [ticketPrefix, setTicketPrefix] = useState('');
  const [nextTicketNumber, setNextTicketNumber] = useState<number>(1000);

  // Autoresponse state
  const [autoresponseEnabled, setAutoresponseEnabled] = useState(false);
  const [autoresponseSubject, setAutoresponseSubject] = useState('');
  const [autoresponseBody, setAutoresponseBody] = useState('');

  // Brand identity state
  const [url, setUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');

  // Outbound email state
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');

  // Initialize form with brand data
  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setTicketPrefix(brand.ticketPrefix || '');
      setNextTicketNumber(brand.nextTicketNumber || 1000);
      // Autoresponse
      setAutoresponseEnabled(brand.autoresponseEnabled || false);
      setAutoresponseSubject(brand.autoresponseSubject || '');
      setAutoresponseBody(brand.autoresponseBody || '');
      // Brand identity
      setUrl(brand.url || '');
      setIconUrl(brand.iconUrl || '');
      // Outbound email
      setFromName(brand.fromName || '');
      setFromEmail(brand.fromEmail || '');
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

    // Validate next ticket number
    if (nextTicketNumber < (brand?.nextTicketNumber || 1)) {
      toast.error('Next ticket number cannot be lower than current value');
      return;
    }

    try {
      await updateBrand.mutateAsync({
        name: name.trim(),
        ticketPrefix: ticketPrefix.trim().toUpperCase(),
        // Only send if changed (to avoid unnecessary updates)
        ...(nextTicketNumber !== brand?.nextTicketNumber && {
          ticketNumberStart: nextTicketNumber,
        }),
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleSaveAutoresponse = async () => {
    // Validate if enabled
    if (autoresponseEnabled) {
      if (!autoresponseSubject.trim()) {
        toast.error('Autoresponse subject is required when enabled');
        return;
      }
      if (!autoresponseBody.trim()) {
        toast.error('Autoresponse message is required when enabled');
        return;
      }
    }

    try {
      await updateBrand.mutateAsync({
        autoresponseEnabled,
        autoresponseSubject: autoresponseSubject.trim() || undefined,
        autoresponseBody: autoresponseBody.trim() || undefined,
      });
      toast.success('Autoresponse settings saved');
    } catch {
      toast.error('Failed to save autoresponse settings');
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
                  → {ticketPrefix || 'XXX'}-{nextTicketNumber}
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
                The next ticket created will use this number. Useful when migrating from another platform to avoid ID collisions.
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
            <CardDescription>
              Website URL and icon for your brand
            </CardDescription>
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
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
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

            <Button
              onClick={async () => {
                try {
                  await updateBrand.mutateAsync({
                    url: url.trim() || undefined,
                    iconUrl: iconUrl.trim() || undefined,
                  });
                  toast.success('Brand identity saved');
                } catch {
                  toast.error('Failed to save brand identity');
                }
              }}
              disabled={updateBrand.isPending}
            >
              {updateBrand.isPending ? 'Saving...' : 'Save Brand Identity'}
            </Button>
          </CardContent>
        </Card>

        {/* Outbound Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Outbound Email</CardTitle>
            <CardDescription>
              Configure how emails are sent from this brand
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromName">Sender Name</Label>
              <Input
                id="fromName"
                placeholder="e.g., Epic Design Labs Support"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                The name that appears in the "From" field of outbound emails
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromEmail">Sender Email</Label>
              <Input
                id="fromEmail"
                type="email"
                placeholder="support@yourdomain.com"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Custom sender email address. Requires domain verification with Resend.
              </p>
            </div>

            <Separator />

            <Button
              onClick={async () => {
                try {
                  await updateBrand.mutateAsync({
                    fromName: fromName.trim() || undefined,
                    fromEmail: fromEmail.trim() || undefined,
                  });
                  toast.success('Outbound email settings saved');
                } catch {
                  toast.error('Failed to save outbound email settings');
                }
              }}
              disabled={updateBrand.isPending}
            >
              {updateBrand.isPending ? 'Saving...' : 'Save Email Settings'}
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

        {/* Autoresponse */}
        <Card>
          <CardHeader>
            <CardTitle>Autoresponse</CardTitle>
            <CardDescription>
              Automatically reply to new tickets created via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoresponse-enabled">Enable Autoresponse</Label>
                <p className="text-sm text-muted-foreground">
                  Send an automatic reply when a new ticket is created via email
                </p>
              </div>
              <Switch
                id="autoresponse-enabled"
                checked={autoresponseEnabled}
                onCheckedChange={setAutoresponseEnabled}
              />
            </div>

            {autoresponseEnabled && (
              <>
                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="autoresponse-subject">Email Subject</Label>
                  <Input
                    id="autoresponse-subject"
                    placeholder="e.g., We received your request [{{ticketNumber}}]"
                    value={autoresponseSubject}
                    onChange={(e) => setAutoresponseSubject(e.target.value)}
                    maxLength={200}
                  />
                  <p className="text-sm text-muted-foreground">
                    Use <code className="rounded bg-muted px-1">{'{{ticketNumber}}'}</code> for ticket ID, <code className="rounded bg-muted px-1">{'{{ticketTitle}}'}</code> for subject
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoresponse-body">Message Body</Label>
                  <Textarea
                    id="autoresponse-body"
                    placeholder="Thank you for contacting us. We have received your request and will respond shortly."
                    value={autoresponseBody}
                    onChange={(e) => setAutoresponseBody(e.target.value)}
                    rows={6}
                  />
                  <p className="text-sm text-muted-foreground">
                    Available placeholders: <code className="rounded bg-muted px-1">{'{{ticketNumber}}'}</code>, <code className="rounded bg-muted px-1">{'{{ticketTitle}}'}</code>, <code className="rounded bg-muted px-1">{'{{customerName}}'}</code>, <code className="rounded bg-muted px-1">{'{{brandName}}'}</code>
                  </p>
                </div>
              </>
            )}

            <Separator />

            <Button onClick={handleSaveAutoresponse} disabled={updateBrand.isPending}>
              {updateBrand.isPending ? 'Saving...' : 'Save Autoresponse Settings'}
            </Button>
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
