'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  useSyncEmail,
  useRetryConnection,
  useReconnectEmail,
} from '@/lib/hooks';
import { OutboundReplyMode } from '@/lib/api/domains';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Trash2,
  Plus,
  Star,
  Mail,
  AlertCircle,
  RefreshCw,
  Unplug,
  Link2,
  Send,
  Inbox,
} from 'lucide-react';
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

export default function EmailSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const brandId = params.brandId as string;

  // Invalidate broken-connections cache when returning from successful OAuth
  useEffect(() => {
    if (searchParams.get('connected') === 'gmail') {
      queryClient.invalidateQueries({ queryKey: ['broken-connections'] });
      const email = searchParams.get('email');
      if (email) {
        toast.success(`Connected ${email} successfully!`);
      }
    }
  }, [searchParams, queryClient]);

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
  const syncEmail = useSyncEmail();
  const retryConnection = useRetryConnection();
  const reconnectEmail = useReconnectEmail();

  // Autoresponse state
  const [autoresponseEnabled, setAutoresponseEnabled] = useState(false);
  const [autoresponseSubject, setAutoresponseSubject] = useState('');
  const [autoresponseBody, setAutoresponseBody] = useState('');

  // Default autoresponse content
  const DEFAULT_AUTORESPONSE_SUBJECT = "We've received your request [{{ticketNumber}}]";
  const DEFAULT_AUTORESPONSE_BODY = `Thanks for contacting us.
We'll reach back out soon!

- {{brandName}}`;

  // Add domain dialog state
  const [addDomainDialogOpen, setAddDomainDialogOpen] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState('');

  // Add email connection dialog state
  const [showAddConnectionDialog, setShowAddConnectionDialog] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');

  // Disconnect confirmation dialog
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [disconnectingConnection, setDisconnectingConnection] = useState<{id: string, email: string} | null>(null);

  // Outbound domain settings state
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [replyMode, setReplyMode] = useState<OutboundReplyMode>('SINGLE');

  // Get outbound domain
  const outboundDomain = domains?.find((d) => d.type === 'OUTBOUND' && d.isPrimary);

  // Initialize form with brand/domain data
  useEffect(() => {
    if (brand) {
      setAutoresponseEnabled(brand.autoresponseEnabled || false);
      setAutoresponseSubject(brand.autoresponseSubject || '');
      setAutoresponseBody(brand.autoresponseBody || '');
    }
  }, [brand]);

  useEffect(() => {
    if (outboundDomain) {
      setFromName(outboundDomain.fromName || '');
      setFromEmail(outboundDomain.fromEmail || '');
      setReplyMode(outboundDomain.replyMode || 'SINGLE');
    }
  }, [outboundDomain]);

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
        data: { domain: newDomainInput.trim(), type: 'OUTBOUND' },
      });
      toast.success('Domain added - configure DNS records to verify');
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
        toast.error(result.error || 'Verification failed - check DNS records');
      }
    } catch {
      toast.error('Failed to verify domain');
    }
  };

  const handleSaveOutboundSettings = async () => {
    if (!outboundDomain) return;

    // Validate fromEmail is on the domain
    if (fromEmail && !fromEmail.endsWith(`@${outboundDomain.domain}`)) {
      toast.error(`Email must be on ${outboundDomain.domain}`);
      return;
    }

    try {
      await updateDomain.mutateAsync({
        brandId,
        domainId: outboundDomain.id,
        data: {
          fromName: fromName || undefined,
          fromEmail: fromEmail || undefined,
          replyMode,
        },
      });
      toast.success('Sending settings saved');
    } catch {
      toast.error('Failed to save settings');
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

  const handleReconnectEmail = async (connectionId: string) => {
    try {
      await reconnectEmail.mutateAsync({ brandId, connectionId });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to initiate reconnection');
    }
  };

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
      {/* ================================================================== */}
      {/* RECEIVING EMAIL */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Receiving Email
          </CardTitle>
          <CardDescription>
            Choose how emails become tickets. You can use multiple methods.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gmail / Google Workspace */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Gmail / Google Workspace
                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Full two-way sync. Replies sent from your connected address.
                </p>
              </div>
              <Button size="sm" onClick={() => setShowAddConnectionDialog(true)}>
                <Plus className="mr-1 h-4 w-4" /> Connect
              </Button>
            </div>

            {emailConnections && emailConnections.length > 0 ? (
              <div className="space-y-3">
                {emailConnections.map((connection) => (
                  <div key={connection.id} className="rounded-lg bg-muted/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full p-1.5 ${
                          connection.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {connection.status === 'ACTIVE' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{connection.email}</span>
                            {connection.isPrimary && (
                              <Badge variant="outline" className="text-xs">
                                <Star className="mr-1 h-3 w-3 fill-current" /> Primary
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{connection.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!connection.isPrimary && (
                          <Button
                            variant="ghost"
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

                    {/* Error state */}
                    {(connection.status === 'ERROR' || connection.status === 'DISCONNECTED') && (
                      <div className="rounded border border-red-200 bg-red-50 p-2 flex items-center justify-between gap-2">
                        <span className="text-sm text-red-700">{connection.errorMessage || 'Connection failed'}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryConnection(connection.id)}
                            disabled={retryConnection.isPending}
                          >
                            <RefreshCw className={`mr-1 h-3 w-3 ${retryConnection.isPending ? 'animate-spin' : ''}`} />
                            Retry
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReconnectEmail(connection.id)}
                            disabled={reconnectEmail.isPending}
                          >
                            <Link2 className="mr-1 h-3 w-3" />
                            Reconnect
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Sync info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {connection.lastSyncAt
                          ? `Last synced: ${new Date(connection.lastSyncAt).toLocaleString()}`
                          : 'Never synced'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSyncEmail(connection.id, true)}
                        disabled={syncEmail.isPending}
                      >
                        <RefreshCw className={`mr-1 h-3 w-3 ${syncEmail.isPending ? 'animate-spin' : ''}`} />
                        Sync Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No Gmail accounts connected.</p>
            )}
          </div>

          {/* Email Forwarding */}
          <div className="rounded-lg border p-4 space-y-4">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Forwarding
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Forward emails from any provider. Receive-only (replies use sending settings below).
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <p className="text-sm font-medium">Your forwarding address:</p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-background px-2 py-1 rounded border flex-1 truncate">
                  {brandId}@inbound.dispatchtickets.com
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(`${brandId}@inbound.dispatchtickets.com`)}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">How to set up:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to your email provider&apos;s settings</li>
                <li>Set up forwarding from your support address (e.g., support@yourcompany.com)</li>
                <li>Forward to the address above</li>
              </ol>
              <p className="mt-2 text-xs">
                Works with Gmail, Google Workspace, Microsoft 365, and most email providers.
                You can forward from multiple addresses.
              </p>
            </div>
          </div>

          {/* Microsoft 365 - Coming Soon */}
          <div className="rounded-lg border border-dashed p-4 opacity-60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Microsoft 365 / Outlook
                  <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect Outlook or Exchange accounts for two-way sync.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* SENDING EMAIL */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Sending Email
          </CardTitle>
          <CardDescription>
            Configure how replies are sent. Gmail-connected tickets reply through their account.
            Other tickets use these settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!outboundDomain ? (
            <>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm">
                  <strong>Current:</strong> Replies sent from{' '}
                  <code className="bg-background px-1 rounded">notifications@dispatchtickets.com</code>
                </p>
              </div>

              <div className="rounded-lg border border-dashed p-4 space-y-3">
                <div>
                  <p className="font-medium">Add a custom domain</p>
                  <p className="text-sm text-muted-foreground">
                    Send replies from your own address (e.g., support@yourcompany.com)
                  </p>
                </div>
                <Button onClick={() => setAddDomainDialogOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Add Custom Domain
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Domain status */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{outboundDomain.domain}</span>
                    {outboundDomain.verified ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="mr-1 h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" /> Pending
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDomain(outboundDomain.id)}
                    disabled={removeDomain.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* DNS records if not verified */}
                {!outboundDomain.verified && outboundDomain.records.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Add these DNS records to verify:</p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Type</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead className="w-16">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outboundDomain.records.map((record, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{record.type}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <code className="text-xs truncate max-w-32" title={record.name}>{record.name}</code>
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
                                  <code className="text-xs truncate max-w-48" title={record.value}>{record.value}</code>
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
                    <Button
                      onClick={() => handleVerifyDomain(outboundDomain.id)}
                      disabled={verifyDomain.isPending}
                    >
                      {verifyDomain.isPending ? 'Verifying...' : 'Verify Domain'}
                    </Button>
                  </div>
                )}

                {/* Sender settings - only show if verified */}
                {outboundDomain.verified && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid gap-4 sm:grid-cols-2">
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
                          placeholder={`support@${outboundDomain.domain}`}
                          value={fromEmail}
                          onChange={(e) => setFromEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Reply behavior</Label>
                      <RadioGroup value={replyMode} onValueChange={(v) => setReplyMode(v as OutboundReplyMode)}>
                        <div className="flex items-start space-x-3 p-3 rounded-lg border">
                          <RadioGroupItem value="SINGLE" id="reply-single" className="mt-1" />
                          <div className="space-y-1">
                            <Label htmlFor="reply-single" className="font-medium cursor-pointer">
                              Send all replies from one address
                              <Badge variant="secondary" className="ml-2 text-xs">Recommended</Badge>
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              All tickets reply from {fromEmail || `support@${outboundDomain.domain}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 rounded-lg border">
                          <RadioGroupItem value="MATCH" id="reply-match" className="mt-1" />
                          <div className="space-y-1">
                            <Label htmlFor="reply-match" className="font-medium cursor-pointer">
                              Match the address the email was sent to
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Replies to hr@{outboundDomain.domain} come from hr@{outboundDomain.domain}, etc.
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    <Button
                      onClick={handleSaveOutboundSettings}
                      disabled={updateDomain.isPending}
                    >
                      {updateDomain.isPending ? 'Saving...' : 'Save Sending Settings'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* AUTO-REPLY */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Reply</CardTitle>
          <CardDescription>
            Automatically reply when new tickets are created via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoresponse-enabled">Enable auto-reply</Label>
              <p className="text-sm text-muted-foreground">
                Send an automatic confirmation when a ticket is created
              </p>
            </div>
            <Switch
              id="autoresponse-enabled"
              checked={autoresponseEnabled}
              onCheckedChange={(enabled) => {
                setAutoresponseEnabled(enabled);
                // Set default content when enabling if fields are empty
                if (enabled) {
                  if (!autoresponseSubject.trim()) {
                    setAutoresponseSubject(DEFAULT_AUTORESPONSE_SUBJECT);
                  }
                  if (!autoresponseBody.trim()) {
                    setAutoresponseBody(DEFAULT_AUTORESPONSE_BODY);
                  }
                }
              }}
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
                  <p className="text-xs text-muted-foreground">
                    Use{' '}
                    <code
                      className="bg-muted px-1 rounded cursor-pointer hover:bg-muted/80"
                      onClick={() => copyToClipboard('{{ticketNumber}}')}
                      title="Click to copy"
                    >
                      {'{{ticketNumber}}'}
                    </code>{' '}
                    for ticket ID
                  </p>
                </div>
                <div className="space-y-2 lg:row-span-2">
                  <Label htmlFor="autoresponse-body">Message Body</Label>
                  <Textarea
                    id="autoresponse-body"
                    placeholder="Thank you for contacting us..."
                    value={autoresponseBody}
                    onChange={(e) => setAutoresponseBody(e.target.value)}
                    rows={6}
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders:{' '}
                    <code
                      className="bg-muted px-1 rounded cursor-pointer hover:bg-muted/80"
                      onClick={() => copyToClipboard('{{ticketNumber}}')}
                      title="Click to copy"
                    >
                      {'{{ticketNumber}}'}
                    </code>,{' '}
                    <code
                      className="bg-muted px-1 rounded cursor-pointer hover:bg-muted/80"
                      onClick={() => copyToClipboard('{{ticketTitle}}')}
                      title="Click to copy"
                    >
                      {'{{ticketTitle}}'}
                    </code>,{' '}
                    <code
                      className="bg-muted px-1 rounded cursor-pointer hover:bg-muted/80"
                      onClick={() => copyToClipboard('{{customerName}}')}
                      title="Click to copy"
                    >
                      {'{{customerName}}'}
                    </code>,{' '}
                    <code
                      className="bg-muted px-1 rounded cursor-pointer hover:bg-muted/80"
                      onClick={() => copyToClipboard('{{brandName}}')}
                      title="Click to copy"
                    >
                      {'{{brandName}}'}
                    </code>
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />
          <Button onClick={handleSaveAutoresponse} disabled={updateBrand.isPending}>
            {updateBrand.isPending ? 'Saving...' : 'Save Auto-Reply Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* DIALOGS */}
      {/* ================================================================== */}

      {/* Add Domain Dialog */}
      <Dialog open={addDomainDialogOpen} onOpenChange={setAddDomainDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
            <DialogDescription>
              Send replies from your own domain instead of dispatchtickets.com
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newDomain">Domain</Label>
              <Input
                id="newDomain"
                placeholder="e.g., acme.com"
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                You&apos;ll need to add DNS records to verify ownership
              </p>
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
            <DialogTitle>Connect Gmail Account</DialogTitle>
            <DialogDescription>
              Connect a Gmail or Google Workspace account to receive and send emails
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="connectionName">Connection Name (optional)</Label>
              <Input
                id="connectionName"
                placeholder="e.g., Support, Sales"
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
              This will stop syncing emails from {disconnectingConnection?.email}. Existing tickets will not be affected.
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
