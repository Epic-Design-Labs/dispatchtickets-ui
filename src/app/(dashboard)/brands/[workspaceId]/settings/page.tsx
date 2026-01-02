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
  useBrand,
  useUpdateBrand,
  useDomains,
  useSetInboundDomain,
  useVerifyInboundDomain,
  useRemoveInboundDomain,
  useSetOutboundDomain,
  useVerifyOutboundDomain,
  useUpdateSender,
  useRemoveOutboundDomain,
} from '@/lib/hooks';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Copy, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const { data: brand, isLoading } = useBrand(workspaceId);
  const updateBrand = useUpdateBrand(workspaceId);
  const { data: domains, isLoading: domainsLoading } = useDomains(workspaceId);

  // Domain mutations
  const setInboundDomain = useSetInboundDomain();
  const verifyInboundDomain = useVerifyInboundDomain();
  const removeInboundDomain = useRemoveInboundDomain();
  const setOutboundDomain = useSetOutboundDomain();
  const verifyOutboundDomain = useVerifyOutboundDomain();
  const updateSender = useUpdateSender();
  const removeOutboundDomain = useRemoveOutboundDomain();

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

  // Domain state
  const [inboundDomainInput, setInboundDomainInput] = useState('');
  const [outboundDomainInput, setOutboundDomainInput] = useState('');
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
    }
  }, [brand]);

  // Initialize domain form data
  useEffect(() => {
    if (domains) {
      setFromName(domains.outbound.fromName || '');
      setFromEmail(domains.outbound.fromEmail || '');
    }
  }, [domains]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSetInboundDomain = async () => {
    if (!inboundDomainInput.trim()) {
      toast.error('Please enter a domain');
      return;
    }
    try {
      await setInboundDomain.mutateAsync({ workspaceId, domain: inboundDomainInput.trim() });
      toast.success('Inbound domain configured');
      setInboundDomainInput('');
    } catch {
      toast.error('Failed to configure domain');
    }
  };

  const handleVerifyInboundDomain = async () => {
    try {
      const result = await verifyInboundDomain.mutateAsync(workspaceId);
      if (result.verified) {
        toast.success('Domain verified!');
      } else {
        toast.error(result.error || 'Verification failed');
      }
    } catch {
      toast.error('Failed to verify domain');
    }
  };

  const handleRemoveInboundDomain = async () => {
    try {
      await removeInboundDomain.mutateAsync(workspaceId);
      toast.success('Inbound domain removed');
    } catch {
      toast.error('Failed to remove domain');
    }
  };

  const handleSetOutboundDomain = async () => {
    if (!outboundDomainInput.trim()) {
      toast.error('Please enter a domain');
      return;
    }
    try {
      await setOutboundDomain.mutateAsync({ workspaceId, domain: outboundDomainInput.trim() });
      toast.success('Outbound domain configured - add the DNS records shown below');
      setOutboundDomainInput('');
    } catch {
      toast.error('Failed to configure domain');
    }
  };

  const handleVerifyOutboundDomain = async () => {
    try {
      const result = await verifyOutboundDomain.mutateAsync(workspaceId);
      if (result.verified) {
        toast.success('Domain verified!');
      } else {
        toast.error(result.error || 'Verification failed - DNS may take time to propagate');
      }
    } catch {
      toast.error('Failed to verify domain');
    }
  };

  const handleRemoveOutboundDomain = async () => {
    try {
      await removeOutboundDomain.mutateAsync(workspaceId);
      toast.success('Outbound domain removed');
    } catch {
      toast.error('Failed to remove domain');
    }
  };

  const handleUpdateSender = async () => {
    try {
      await updateSender.mutateAsync({
        workspaceId,
        data: {
          fromEmail: fromEmail.trim() || undefined,
          fromName: fromName.trim() || undefined,
        },
      });
      toast.success('Sender settings updated');
    } catch {
      toast.error('Failed to update sender settings');
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

        {/* Outbound Email Domain */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Outbound Email Domain
              {domains?.outbound.verified ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="mr-1 h-3 w-3" /> Verified
                </Badge>
              ) : domains?.outbound.domain ? (
                <Badge variant="secondary">
                  <Clock className="mr-1 h-3 w-3" /> Pending
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription>
              Send emails from your own domain instead of dispatchtickets.com
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!domains?.outbound.domain ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="outboundDomain">Domain</Label>
                  <div className="flex gap-2">
                    <Input
                      id="outboundDomain"
                      placeholder="e.g., acme.com"
                      value={outboundDomainInput}
                      onChange={(e) => setOutboundDomainInput(e.target.value)}
                    />
                    <Button
                      onClick={handleSetOutboundDomain}
                      disabled={setOutboundDomain.isPending}
                    >
                      {setOutboundDomain.isPending ? 'Adding...' : 'Add Domain'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter your domain to configure email sending
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{domains.outbound.domain}</p>
                    {domains.outbound.verifiedAt && (
                      <p className="text-sm text-muted-foreground">
                        Verified on {new Date(domains.outbound.verifiedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!domains.outbound.verified && (
                      <Button
                        variant="outline"
                        onClick={handleVerifyOutboundDomain}
                        disabled={verifyOutboundDomain.isPending}
                      >
                        {verifyOutboundDomain.isPending ? 'Verifying...' : 'Verify'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveOutboundDomain}
                      disabled={removeOutboundDomain.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {domains.outbound.records.length > 0 && !domains.outbound.verified && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-sm font-medium">DNS Records</p>
                      <p className="mb-3 text-sm text-muted-foreground">
                        Add these records to your DNS provider, then click Verify
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Type</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead className="w-20">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {domains.outbound.records.map((record, i) => (
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
                                  <code className="text-xs break-all max-w-[300px]">{record.value}</code>
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
                  </>
                )}

                {domains.outbound.verified && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fromName">Sender Name</Label>
                        <Input
                          id="fromName"
                          placeholder="e.g., Acme Support"
                          value={fromName}
                          onChange={(e) => setFromName(e.target.value)}
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fromEmail">Sender Email</Label>
                        <Input
                          id="fromEmail"
                          type="email"
                          placeholder={`support@${domains.outbound.domain}`}
                          value={fromEmail}
                          onChange={(e) => setFromEmail(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                          Must be an address on {domains.outbound.domain}
                        </p>
                      </div>
                      <Button onClick={handleUpdateSender} disabled={updateSender.isPending}>
                        {updateSender.isPending ? 'Saving...' : 'Save Sender Settings'}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Inbound Email Domain */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Inbound Email Domain
              {domains?.inbound.verified ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="mr-1 h-3 w-3" /> Verified
                </Badge>
              ) : domains?.inbound.domain ? (
                <Badge variant="secondary">
                  <Clock className="mr-1 h-3 w-3" /> Pending
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription>
              Receive tickets from a custom email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <Separator />

            {!domains?.inbound.domain ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inboundDomain">Custom Domain</Label>
                  <div className="flex gap-2">
                    <Input
                      id="inboundDomain"
                      placeholder="e.g., support.acme.com"
                      value={inboundDomainInput}
                      onChange={(e) => setInboundDomainInput(e.target.value)}
                    />
                    <Button
                      onClick={handleSetInboundDomain}
                      disabled={setInboundDomain.isPending}
                    >
                      {setInboundDomain.isPending ? 'Adding...' : 'Add Domain'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use a subdomain like support.acme.com for inbound emails
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{domains.inbound.domain}</p>
                    {domains.inbound.verifiedAt && (
                      <p className="text-sm text-muted-foreground">
                        Verified on {new Date(domains.inbound.verifiedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!domains.inbound.verified && (
                      <Button
                        variant="outline"
                        onClick={handleVerifyInboundDomain}
                        disabled={verifyInboundDomain.isPending}
                      >
                        {verifyInboundDomain.isPending ? 'Verifying...' : 'Verify'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveInboundDomain}
                      disabled={removeInboundDomain.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {domains.inbound.records.length > 0 && !domains.inbound.verified && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-sm font-medium">DNS Records</p>
                      <p className="mb-3 text-sm text-muted-foreground">
                        Add this MX record to your DNS provider, then click Verify
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Type</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead className="w-24">Priority</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {domains.inbound.records.map((record, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{record.type}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <code className="text-xs">{record.name}</code>
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
                                  <code className="text-xs">{record.value}</code>
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
                              <TableCell className="font-mono text-xs">{record.priority}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </>
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
