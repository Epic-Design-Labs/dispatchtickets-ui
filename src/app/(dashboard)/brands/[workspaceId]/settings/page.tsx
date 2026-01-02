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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useBrand,
  useUpdateBrand,
  useDomains,
  useAddDomain,
  useVerifyDomain,
  useUpdateDomain,
  useRemoveDomain,
} from '@/lib/hooks';
import { WorkspaceDomain, DomainType } from '@/lib/api/domains';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Copy, Trash2, Plus, Star } from 'lucide-react';

interface DomainCardProps {
  domain: WorkspaceDomain;
  workspaceId: string;
  onVerify: () => void;
  onSetPrimary: () => void;
  onUpdateSender: (fromName?: string, fromEmail?: string) => void;
  onRemove: () => void;
  isVerifying: boolean;
  isUpdating: boolean;
  isRemoving: boolean;
}

function DomainCard({
  domain,
  workspaceId,
  onVerify,
  onSetPrimary,
  onUpdateSender,
  onRemove,
  isVerifying,
  isUpdating,
  isRemoving,
}: DomainCardProps) {
  const [fromName, setFromName] = useState(domain.fromName || '');
  const [fromEmail, setFromEmail] = useState(domain.fromEmail || '');
  const [showSenderForm, setShowSenderForm] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <p className="font-medium">{domain.domain}</p>
          {domain.isPrimary && (
            <Badge variant="outline" className="text-xs">
              <Star className="mr-1 h-3 w-3 fill-current" /> Primary
            </Badge>
          )}
          {domain.verified ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="mr-1 h-3 w-3" /> Verified
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Clock className="mr-1 h-3 w-3" /> Pending
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {!domain.verified && (
            <Button variant="outline" size="sm" onClick={onVerify} disabled={isVerifying}>
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>
          )}
          {domain.verified && !domain.isPrimary && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSetPrimary}
              disabled={isUpdating}
            >
              Set Primary
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={isRemoving}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {domain.verifiedAt && (
        <p className="text-sm text-muted-foreground">
          Verified on {new Date(domain.verifiedAt).toLocaleDateString()}
        </p>
      )}

      {/* DNS Records for pending domains */}
      {!domain.verified && domain.records.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">DNS Records</p>
          <p className="text-sm text-muted-foreground">
            Add these records to your DNS provider, then click Verify
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Value</TableHead>
                {domain.type === 'INBOUND' && <TableHead className="w-20">Priority</TableHead>}
                <TableHead className="w-16">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domain.records.map((record, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{record.type}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="text-xs break-all">{record.name}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(record.name)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="text-xs break-all max-w-[250px]">{record.value}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(record.value)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  {domain.type === 'INBOUND' && (
                    <TableCell className="font-mono text-xs">{record.priority}</TableCell>
                  )}
                  <TableCell>
                    {record.status === 'verified' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : record.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sender Settings for verified outbound domains */}
      {domain.type === 'OUTBOUND' && domain.verified && (
        <div className="space-y-4 pt-2 border-t">
          {!showSenderForm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sender:</p>
                <p className="text-sm">
                  {domain.fromName || 'Not set'} &lt;{domain.fromEmail || `support@${domain.domain}`}&gt;
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowSenderForm(true)}>
                Edit Sender
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`fromName-${domain.id}`}>Sender Name</Label>
                <Input
                  id={`fromName-${domain.id}`}
                  placeholder="e.g., Acme Support"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`fromEmail-${domain.id}`}>Sender Email</Label>
                <Input
                  id={`fromEmail-${domain.id}`}
                  type="email"
                  placeholder={`support@${domain.domain}`}
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Must be an address on {domain.domain}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onUpdateSender(fromName || undefined, fromEmail || undefined);
                    setShowSenderForm(false);
                  }}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSenderForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const { data: brand, isLoading } = useBrand(workspaceId);
  const updateBrand = useUpdateBrand(workspaceId);
  const { data: domains, isLoading: domainsLoading } = useDomains(workspaceId);

  // Domain mutations
  const addDomain = useAddDomain();
  const verifyDomain = useVerifyDomain();
  const updateDomain = useUpdateDomain();
  const removeDomain = useRemoveDomain();

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

  // Add domain dialog state
  const [addDomainDialogOpen, setAddDomainDialogOpen] = useState(false);
  const [addDomainType, setAddDomainType] = useState<DomainType>('OUTBOUND');
  const [newDomainInput, setNewDomainInput] = useState('');

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
    }
  }, [brand]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleAddDomain = async () => {
    if (!newDomainInput.trim()) {
      toast.error('Please enter a domain');
      return;
    }
    try {
      await addDomain.mutateAsync({
        workspaceId,
        data: { domain: newDomainInput.trim(), type: addDomainType },
      });
      toast.success(`${addDomainType === 'INBOUND' ? 'Inbound' : 'Outbound'} domain added`);
      setNewDomainInput('');
      setAddDomainDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to add domain');
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const result = await verifyDomain.mutateAsync({ workspaceId, domainId });
      if (result.verified) {
        toast.success('Domain verified!');
      } else {
        toast.error(result.error || 'Verification failed');
      }
    } catch {
      toast.error('Failed to verify domain');
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    try {
      await updateDomain.mutateAsync({ workspaceId, domainId, data: { isPrimary: true } });
      toast.success('Domain set as primary');
    } catch {
      toast.error('Failed to set primary domain');
    }
  };

  const handleUpdateSender = async (domainId: string, fromName?: string, fromEmail?: string) => {
    try {
      await updateDomain.mutateAsync({
        workspaceId,
        domainId,
        data: { fromName, fromEmail },
      });
      toast.success('Sender settings updated');
    } catch {
      toast.error('Failed to update sender settings');
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    try {
      await removeDomain.mutateAsync({ workspaceId, domainId });
      toast.success('Domain removed');
    } catch {
      toast.error('Failed to remove domain');
    }
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

  const handleSaveAutoresponse = async () => {
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

  // Filter domains by type
  const outboundDomains = domains?.filter((d) => d.type === 'OUTBOUND') || [];
  const inboundDomains = domains?.filter((d) => d.type === 'INBOUND') || [];

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

        {/* Outbound Email Domains */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Outbound Email Domains</CardTitle>
                <CardDescription>
                  Send emails from your own domains instead of dispatchtickets.com
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setAddDomainType('OUTBOUND');
                  setAddDomainDialogOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Domain
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {domainsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : outboundDomains.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No outbound domains configured. Add one to send emails from your own domain.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {outboundDomains.map((domain) => (
                  <DomainCard
                    key={domain.id}
                    domain={domain}
                    workspaceId={workspaceId}
                    onVerify={() => handleVerifyDomain(domain.id)}
                    onSetPrimary={() => handleSetPrimary(domain.id)}
                    onUpdateSender={(fromName, fromEmail) =>
                      handleUpdateSender(domain.id, fromName, fromEmail)
                    }
                    onRemove={() => handleRemoveDomain(domain.id)}
                    isVerifying={verifyDomain.isPending}
                    isUpdating={updateDomain.isPending}
                    isRemoving={removeDomain.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inbound Email Domains */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inbound Email Domains</CardTitle>
                <CardDescription>
                  Receive tickets from custom email addresses
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setAddDomainType('INBOUND');
                  setAddDomainDialogOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Domain
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Default inbound address */}
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Default Inbound Address</p>
              <div className="flex items-center gap-2">
                <code className="text-sm">{workspaceId}@inbound.dispatchtickets.com</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(`${workspaceId}@inbound.dispatchtickets.com`)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {domainsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : inboundDomains.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No custom inbound domains. Add one to receive emails at your own domain.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {inboundDomains.map((domain) => (
                  <DomainCard
                    key={domain.id}
                    domain={domain}
                    workspaceId={workspaceId}
                    onVerify={() => handleVerifyDomain(domain.id)}
                    onSetPrimary={() => handleSetPrimary(domain.id)}
                    onUpdateSender={() => {}}
                    onRemove={() => handleRemoveDomain(domain.id)}
                    isVerifying={verifyDomain.isPending}
                    isUpdating={updateDomain.isPending}
                    isRemoving={removeDomain.isPending}
                  />
                ))}
              </div>
            )}
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
                    Use <code className="rounded bg-muted px-1">{'{{ticketNumber}}'}</code> for
                    ticket ID, <code className="rounded bg-muted px-1">{'{{ticketTitle}}'}</code>{' '}
                    for subject
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
                    Available placeholders:{' '}
                    <code className="rounded bg-muted px-1">{'{{ticketNumber}}'}</code>,{' '}
                    <code className="rounded bg-muted px-1">{'{{ticketTitle}}'}</code>,{' '}
                    <code className="rounded bg-muted px-1">{'{{customerName}}'}</code>,{' '}
                    <code className="rounded bg-muted px-1">{'{{brandName}}'}</code>
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
            <CardDescription>Unique identifier for API integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4">
              <code className="text-sm text-muted-foreground">{workspaceId}</code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Domain Dialog */}
      <Dialog open={addDomainDialogOpen} onOpenChange={setAddDomainDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {addDomainType === 'INBOUND' ? 'Inbound' : 'Outbound'} Domain
            </DialogTitle>
            <DialogDescription>
              {addDomainType === 'INBOUND'
                ? 'Use a subdomain like support.acme.com for receiving emails'
                : 'Add a domain to send emails from your own address'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newDomain">Domain</Label>
              <Input
                id="newDomain"
                placeholder={
                  addDomainType === 'INBOUND' ? 'e.g., support.acme.com' : 'e.g., acme.com'
                }
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDomainDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDomain} disabled={addDomain.isPending}>
              {addDomain.isPending ? 'Adding...' : 'Add Domain'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
