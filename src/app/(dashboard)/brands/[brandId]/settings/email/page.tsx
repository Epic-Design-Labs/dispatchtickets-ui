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
  useEmailConnections,
  useConnectGmail,
  useDisconnectEmail,
  useSetPrimaryConnection,
  useUpdateEmailConnection,
  useSyncEmail,
  useRetryConnection,
} from '@/lib/hooks';
import { WorkspaceDomain, DomainType } from '@/lib/api/domains';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Copy, Trash2, Plus, Star, Mail, AlertCircle, RefreshCw, Unplug } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DomainCardProps {
  domain: WorkspaceDomain;
  brandId: string;
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
  brandId,
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Type</TableHead>
                  <TableHead className="w-32">Name</TableHead>
                  <TableHead>Value</TableHead>
                  {domain.type === 'INBOUND' && <TableHead className="w-20">Priority</TableHead>}
                  <TableHead className="w-14">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domain.records.map((record, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{record.type}</TableCell>
                    <TableCell className="max-w-32">
                      <div className="flex items-center gap-1">
                        <code className="text-xs truncate" title={record.name}>{record.name}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => copyToClipboard(record.name)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="flex items-center gap-1">
                        <code className="text-xs truncate" title={record.value}>{record.value}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
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

export default function EmailSettingsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const { data: brand, isLoading: brandLoading } = useBrand(brandId);
  const updateBrand = useUpdateBrand(brandId);
  const { data: domains, isLoading: domainsLoading } = useDomains(brandId);
  const { data: emailConnections, isLoading: emailConnectionsLoading } = useEmailConnections(brandId);

  // Domain mutations
  const addDomain = useAddDomain();
  const verifyDomain = useVerifyDomain();
  const updateDomain = useUpdateDomain();
  const removeDomain = useRemoveDomain();

  // Email connection mutations
  const connectGmail = useConnectGmail();
  const disconnectEmail = useDisconnectEmail();
  const setPrimaryConnection = useSetPrimaryConnection();
  const updateEmailConnection = useUpdateEmailConnection();
  const syncEmail = useSyncEmail();
  const retryConnection = useRetryConnection();

  // Autoresponse state
  const [autoresponseEnabled, setAutoresponseEnabled] = useState(false);
  const [autoresponseSubject, setAutoresponseSubject] = useState('');
  const [autoresponseBody, setAutoresponseBody] = useState('');

  // Add domain dialog state
  const [addDomainDialogOpen, setAddDomainDialogOpen] = useState(false);
  const [addDomainType, setAddDomainType] = useState<DomainType>('OUTBOUND');
  const [newDomainInput, setNewDomainInput] = useState('');

  // Add email connection dialog state
  const [showAddConnectionDialog, setShowAddConnectionDialog] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');

  // Disconnect confirmation dialog
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [disconnectingConnection, setDisconnectingConnection] = useState<{id: string, email: string} | null>(null);

  // Initialize form with brand data
  useEffect(() => {
    if (brand) {
      setAutoresponseEnabled(brand.autoresponseEnabled || false);
      setAutoresponseSubject(brand.autoresponseSubject || '');
      setAutoresponseBody(brand.autoresponseBody || '');
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
        brandId,
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
      const result = await verifyDomain.mutateAsync({ brandId, domainId });
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
      await updateDomain.mutateAsync({ brandId, domainId, data: { isPrimary: true } });
      toast.success('Domain set as primary');
    } catch {
      toast.error('Failed to set primary domain');
    }
  };

  const handleUpdateSender = async (domainId: string, fromName?: string, fromEmail?: string) => {
    try {
      await updateDomain.mutateAsync({
        brandId,
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
      await removeDomain.mutateAsync({ brandId, domainId });
      toast.success('Domain removed');
    } catch {
      toast.error('Failed to remove domain');
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

  // Email connection handlers
  const handleConnectGmail = async () => {
    try {
      await connectGmail.mutateAsync({
        brandId,
        connectionName: newConnectionName.trim() || undefined,
      });
      setShowAddConnectionDialog(false);
      setNewConnectionName('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to initiate Gmail connection');
    }
  };

  const handleDisconnectEmail = async () => {
    if (!disconnectingConnection) return;
    try {
      await disconnectEmail.mutateAsync({
        brandId,
        connectionId: disconnectingConnection.id,
      });
      toast.success('Email connection removed');
      setShowDisconnectDialog(false);
      setDisconnectingConnection(null);
    } catch {
      toast.error('Failed to disconnect email');
    }
  };

  const handleSetPrimaryConnection = async (connectionId: string) => {
    try {
      await setPrimaryConnection.mutateAsync({ brandId, connectionId });
      toast.success('Primary connection updated');
    } catch {
      toast.error('Failed to set primary connection');
    }
  };

  const handleSyncEmail = async (connectionId?: string, full = false) => {
    try {
      const result = await syncEmail.mutateAsync({ brandId, connectionId, full });
      if (result.ticketsCreated > 0) {
        toast.success(`Sync complete! ${result.ticketsCreated} new ticket(s) created.`);
      } else {
        toast.success('Sync complete. No new emails found.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to sync emails');
    }
  };

  const handleRetryConnection = async (connectionId: string) => {
    try {
      const result = await retryConnection.mutateAsync({ brandId, connectionId });
      if (result.success) {
        if (result.ticketsCreated > 0) {
          toast.success(`Connection restored! ${result.ticketsCreated} new ticket(s) created.`);
        } else {
          toast.success('Connection restored successfully.');
        }
      } else {
        toast.error(result.error || 'Failed to restore connection');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to retry connection');
    }
  };

  // Filter domains by type
  const outboundDomains = domains?.filter((d) => d.type === 'OUTBOUND') || [];
  const inboundDomains = domains?.filter((d) => d.type === 'INBOUND') || [];

  const isLoading = brandLoading || domainsLoading || emailConnectionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Email Connections (Gmail/OAuth) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Connections
                </CardTitle>
                <CardDescription>
                  Connect Gmail or Google Workspace accounts to receive and send emails
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowAddConnectionDialog(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add Connection
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {emailConnections && emailConnections.length > 0 ? (
              <div className="space-y-4">
                {emailConnections.map((connection) => (
                  <div key={connection.id} className="rounded-lg border p-4 space-y-3">
                    {/* Connection header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full p-2 ${
                          connection.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {connection.status === 'ACTIVE' ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <AlertCircle className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{connection.email}</p>
                            {connection.isPrimary && (
                              <Badge variant="outline" className="text-xs">
                                <Star className="mr-1 h-3 w-3 fill-current" /> Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {connection.name} &middot; {connection.provider === 'GMAIL' ? 'Gmail' : connection.provider}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={connection.status === 'ACTIVE' ? 'default' : 'destructive'}>
                          {connection.status === 'ACTIVE' ? 'Connected' : 'Error'}
                        </Badge>
                        {!connection.isPrimary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetPrimaryConnection(connection.id)}
                            disabled={setPrimaryConnection.isPending}
                          >
                            Set Primary
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setDisconnectingConnection({ id: connection.id, email: connection.email });
                            setShowDisconnectDialog(true);
                          }}
                        >
                          <Unplug className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Error message if any */}
                    {connection.status === 'ERROR' && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-red-700">
                              <strong>Error:</strong> {connection.errorMessage || 'Connection failed'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Click Retry to attempt reconnection, or reconnect your account if the issue persists.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryConnection(connection.id)}
                            disabled={retryConnection.isPending}
                            className="ml-4 shrink-0"
                          >
                            {retryConnection.isPending ? (
                              <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1 h-4 w-4" />
                            )}
                            Retry
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Last sync info and sync buttons */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      {connection.lastSyncAt ? (
                        <p className="text-sm text-muted-foreground">
                          <RefreshCw className="inline h-3 w-3 mr-1" />
                          Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Never synced</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncEmail(connection.id, false)}
                          disabled={syncEmail.isPending}
                        >
                          {syncEmail.isPending ? (
                            <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-4 w-4" />
                          )}
                          Sync
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncEmail(connection.id, true)}
                          disabled={syncEmail.isPending}
                          title="Re-import last 50 emails"
                        >
                          Full
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Not connected state */}
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Mail className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm font-medium">No email connected</p>
                  <p className="text-sm text-muted-foreground">
                    Connect your Gmail account to automatically import emails as tickets and reply from this brand.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setShowAddConnectionDialog(true)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Connect Gmail
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>What happens when you connect:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Incoming emails are automatically converted to tickets</li>
                    <li>Replies from agents are sent from your connected email</li>
                    <li>Customer replies to tickets update the ticket thread</li>
                  </ul>
                </div>
              </div>
            )}
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
          <CardContent>
            {outboundDomains.length === 0 ? (
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
                    brandId={brandId}
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
                <code className="text-sm">{brandId}@inbound.dispatchtickets.com</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(`${brandId}@inbound.dispatchtickets.com`)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {inboundDomains.length === 0 ? (
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
                    brandId={brandId}
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

                <div className="grid gap-4 lg:grid-cols-2">
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
                      ticket ID
                    </p>
                  </div>

                  <div className="space-y-2 lg:row-span-2">
                    <Label htmlFor="autoresponse-body">Message Body</Label>
                    <Textarea
                      id="autoresponse-body"
                      placeholder="Thank you for contacting us. We have received your request and will respond shortly."
                      value={autoresponseBody}
                      onChange={(e) => setAutoresponseBody(e.target.value)}
                      rows={6}
                      className="min-h-[150px]"
                    />
                    <p className="text-sm text-muted-foreground">
                      Placeholders:{' '}
                      <code className="rounded bg-muted px-1">{'{{ticketNumber}}'}</code>,{' '}
                      <code className="rounded bg-muted px-1">{'{{ticketTitle}}'}</code>,{' '}
                      <code className="rounded bg-muted px-1">{'{{customerName}}'}</code>,{' '}
                      <code className="rounded bg-muted px-1">{'{{brandName}}'}</code>
                    </p>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <Button onClick={handleSaveAutoresponse} disabled={updateBrand.isPending}>
              {updateBrand.isPending ? 'Saving...' : 'Save Autoresponse Settings'}
            </Button>
          </CardContent>
        </Card>

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

      {/* Add Email Connection Dialog */}
      <Dialog open={showAddConnectionDialog} onOpenChange={setShowAddConnectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Email Connection</DialogTitle>
            <DialogDescription>
              Connect a Gmail or Google Workspace account to receive and send emails
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="connectionName">Connection Name (optional)</Label>
              <Input
                id="connectionName"
                placeholder="e.g., Marketing, Support, Sales"
                value={newConnectionName}
                onChange={(e) => setNewConnectionName(e.target.value)}
                maxLength={50}
              />
              <p className="text-sm text-muted-foreground">
                A friendly name to identify this connection
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddConnectionDialog(false);
              setNewConnectionName('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleConnectGmail} disabled={connectGmail.isPending}>
              {connectGmail.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Connect Gmail
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Email Confirmation */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={(open) => {
        setShowDisconnectDialog(open);
        if (!open) setDisconnectingConnection(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Email Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop syncing emails from {disconnectingConnection?.email}. Existing tickets will not be affected, but new emails will no longer create tickets automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectEmail}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnectEmail.isPending ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
