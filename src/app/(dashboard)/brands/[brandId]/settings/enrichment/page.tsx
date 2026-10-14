'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { EnrichmentPanel } from '@/components/enrichment';
import {
  useEnrichment,
  useUpsertEnrichment,
  useDeleteEnrichment,
  useRotateEnrichmentSecret,
  useTestEnrichment,
  useRevealEnrichmentSecret,
} from '@/lib/hooks/use-enrichment';
import type { EnrichmentProbeResult } from '@/lib/api/enrichment';

const EVENT_LABELS: Record<string, string> = {
  'ticket.created': 'When a ticket is created',
  'ticket.opened': 'When an agent opens a ticket (re-fetch stale context)',
};

export default function EnrichmentPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const { data: config, isLoading } = useEnrichment(brandId);
  const upsert = useUpsertEnrichment();
  const remove = useDeleteEnrichment();
  const rotate = useRotateEnrichmentSecret();
  const test = useTestEnrichment();
  const reveal = useRevealEnrichmentSecret();

  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [events, setEvents] = useState<string[]>(['ticket.created']);
  const [timeoutMs, setTimeoutMs] = useState(2000);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [result, setResult] = useState<EnrichmentProbeResult | null>(null);

  useEffect(() => {
    if (!config) return;
    setUrl(config.url);
    setEnabled(config.enabled);
    setEvents(config.events ?? []);
    setTimeoutMs(config.timeoutMs);
  }, [config]);

  const maxTimeout = config?.maxTimeoutMs ?? 2000;
  const supportedEvents = config?.supportedEvents ?? [
    'ticket.created',
    'ticket.opened',
  ];

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        brandId,
        data: { url, enabled, events, timeoutMs },
      });
      toast.success('Enrichment endpoint saved');
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? 'Could not save the enrichment endpoint'
      );
    }
  };

  // The probe runs against whatever is in the form, not what is saved, so an
  // endpoint can be verified before it is committed.
  const handleTest = async () => {
    setResult(null);
    try {
      setResult(await test.mutateAsync({ brandId, url: url || undefined }));
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? 'Could not reach the enrichment endpoint'
      );
    }
  };

  // The secret is never in the config payload; it is fetched on demand so it
  // does not sit in the query cache or travel to every ticket view.
  const handleToggleSecret = async () => {
    if (revealedSecret) {
      setRevealedSecret(null);
      return;
    }
    try {
      setRevealedSecret(await reveal.mutateAsync({ brandId }));
    } catch (err: any) {
      toast.error(
        err?.response?.status === 403
          ? 'Only owners and admins can reveal the signing secret'
          : 'Could not reveal the secret'
      );
    }
  };

  const handleRotate = async () => {
    try {
      // Rotate returns the new secret once, because it has to be copied out.
      const updated = await rotate.mutateAsync({ brandId });
      setRevealedSecret(updated.secret);
      toast.success('New signing secret generated — copy it now');
    } catch (err: any) {
      toast.error(
        err?.response?.status === 403
          ? 'Only owners and admins can rotate the signing secret'
          : 'Could not rotate the secret'
      );
    }
  };

  const handleRemove = async () => {
    try {
      await remove.mutateAsync({ brandId });
      setUrl('');
      setResult(null);
      toast.success('Enrichment endpoint removed');
    } catch {
      toast.error('Could not remove the enrichment endpoint');
    }
  };

  const toggleEvent = (event: string, checked: boolean) => {
    setEvents((current) =>
      checked ? [...current, event] : current.filter((e) => e !== event)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Context endpoint</CardTitle>
          <CardDescription>
            Dispatch calls your URL when a ticket arrives and shows whatever you
            return on the ticket, so agents see your account data without
            leaving the ticket. The request is signed, capped at{' '}
            {maxTimeout / 1000}s, and never blocks ticket creation — if your
            endpoint is slow or down, the ticket is created without context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="url">Endpoint URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com/dispatch/context"
            />
            <p className="text-xs text-muted-foreground">
              Must be a public HTTPS URL. Redirects are not followed — point
              this at the final address.
            </p>
          </div>

          {config && (
            <div className="space-y-2">
              <Label htmlFor="secret">Signing secret</Label>
              <div className="flex gap-2">
                <Input
                  id="secret"
                  readOnly
                  value={revealedSecret ?? config.secretPreview ?? ''}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleToggleSecret}
                  disabled={reveal.isPending}
                  aria-label={revealedSecret ? 'Hide secret' : 'Reveal secret'}
                >
                  {reveal.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : revealedSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRotate}
                  disabled={rotate.isPending}
                >
                  {rotate.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-4 w-4" />
                  )}
                  Rotate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Verify{' '}
                <code className="rounded bg-muted px-1">
                  X-Dispatch-Signature: sha256=&lt;hex&gt;
                </code>{' '}
                — an HMAC-SHA256 of the raw request body using this secret.
                Rotating takes effect immediately.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Fetch context</Label>
            {supportedEvents.map((event) => (
              <label
                key={event}
                className="flex items-center gap-2 text-sm font-normal"
              >
                <Checkbox
                  checked={events.includes(event)}
                  onCheckedChange={(checked) =>
                    toggleEvent(event, checked === true)
                  }
                />
                {EVENT_LABELS[event] ?? event}
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              min={250}
              max={maxTimeout}
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(Number(e.target.value))}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Capped at {maxTimeout}ms. The budget covers the whole exchange,
              including reading the response.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Enabled</p>
              <p className="text-xs text-muted-foreground">
                Turn off to stop calling the endpoint without deleting it.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSave} disabled={!url || upsert.isPending}>
              {upsert.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!url || test.isPending}
            >
              {test.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Test
            </Button>
            {config && (
              <Button
                variant="ghost"
                className="ml-auto text-destructive hover:text-destructive"
                onClick={handleRemove}
                disabled={remove.isPending}
              >
                Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {config && config.failureCount > 0 && (
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {config.failureCount} consecutive{' '}
              {config.failureCount === 1 ? 'failure' : 'failures'}
            </CardTitle>
            <CardDescription>
              Tickets are still being created normally; they just have no
              context attached.
            </CardDescription>
          </CardHeader>
          {config.lastError && (
            <CardContent>
              <code className="block break-all rounded bg-muted p-2 text-xs">
                {config.lastError}
              </code>
            </CardContent>
          )}
        </Card>
      )}

      {result && <TestResult result={result} />}
    </div>
  );
}

/**
 * The Test result is the whole point of the Test button: it has to say exactly
 * what was wrong, including every field the server dropped, or a tenant cannot
 * get the contract right without guessing.
 */
function TestResult({ result }: { result: EnrichmentProbeResult }) {
  return (
    <Card className={result.ok ? 'border-green-300' : 'border-red-300'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {result.ok ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          {result.ok ? 'Endpoint responded correctly' : 'Test failed'}
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {result.status ? `HTTP ${result.status} · ` : ''}
            {result.durationMs}ms
          </span>
        </CardTitle>
        {result.error && (
          <CardDescription className="text-red-600">
            {result.error}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {result.warnings.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-700">
              Dropped from the response:
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700">
              {result.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {result.payload && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              This is how it will look on a ticket:
            </p>
            <div className="rounded-lg border p-3">
              <EnrichmentPanel
                enrichment={result.payload}
                enrichedAt={new Date().toISOString()}
              />
            </div>
          </div>
        )}

        {result.rawBody && (
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Raw response
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-xs">
              {result.rawBody}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
