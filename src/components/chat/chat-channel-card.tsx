'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Copy, Globe, Info, Lock, MessageSquare, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useBrand, useSubscription, useUpdateBrand, useUsage } from '@/lib/hooks';
import { useAuth } from '@/providers';

/**
 * Turn the chat widget on and choose which sites may embed it.
 *
 * The role check here only decides what to render. The API refuses these
 * fields from anyone but owners and admins regardless (BrandsService.update).
 */
const WIDGET_URL =
  process.env.NEXT_PUBLIC_CHAT_WIDGET_URL || 'https://widget.dispatchtickets.com/v0/widget.js';
const API_ORIGIN = 'https://api.dispatchtickets.com';

function htmlSnippet(brandId: string) {
  return `<script
  src="${WIDGET_URL}"
  data-brand="${brandId}"
  data-title="Chat with us"
  async></script>`;
}

function nextSnippet(brandId: string) {
  return `import Script from 'next/script';

// In the layout for the pages that should show chat:
<Script
  src="${WIDGET_URL}"
  data-brand="${brandId}"
  data-title="Chat with us"
  strategy="afterInteractive"
/>`;
}

function identityServerSnippet(brandId: string) {
  return `// On your server, with your Dispatch API key, for the signed-in user.
// Cache it for up to an hour (it expires after one).
const res = await fetch(
  'https://api.dispatchtickets.com/v1/brands/${brandId}/chat/identity-token',
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${process.env.DISPATCH_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: user.id, email: user.email, name: user.name }),
  },
);
const { token } = await res.json();`;
}

const IDENTITY_CLIENT_SNIPPET = `// 1. Once, before the widget script loads (e.g. in the same layout). Calls
//    made before the widget finishes loading are queued instead of lost.
window.DispatchChat = window.DispatchChat || { q: [] };
['open', 'close', 'toggle', 'on', 'registerAction', 'setContext', 'identify', 'reset']
  .forEach((m) => {
    window.DispatchChat[m] = window.DispatchChat[m] ||
      ((...args) => window.DispatchChat.q.push([m, args]));
  });

// 2. Once the user is signed in, with the token from your server:
window.DispatchChat.identify(token);

// 3. On sign-out, so the next person on this device starts fresh:
window.DispatchChat.reset();`;

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative">
      <pre className="bg-muted px-3 py-2 pr-10 rounded text-xs font-mono overflow-x-auto whitespace-pre">{code}</pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-8 w-8"
        aria-label={`Copy ${label}`}
        onClick={() => {
          navigator.clipboard.writeText(code);
          toast.success(`${label} copied`);
        }}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ChatHours {
  start: string;
  end: string;
  days: number[];
  timezone: string;
}

interface ChatForm {
  enabled: boolean;
  origins: string[];
  greeting: string;
  offlineMessage: string;
  hoursEnabled: boolean;
  hours: ChatHours;
  // Minutes, as typed; blank = the default.
  alertWarning: string;
  alertCritical: string;
}

const DEFAULT_ALERT_MINUTES = { warning: 1, critical: 3 };

const DEFAULT_HOURS = (): ChatHours => ({
  start: '09:00',
  end: '17:00',
  days: [1, 2, 3, 4, 5],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ChatChannelCard({ brandId }: { brandId: string }) {
  const { data: brand, isLoading } = useBrand(brandId);
  const updateBrand = useUpdateBrand(brandId);
  const { session } = useAuth();
  const role = (session?.orgRole ?? '').toLowerCase();
  const canManage = role === 'owner' || role === 'admin';
  // Chat is for paid plans. The API enforces it; this only explains it.
  const { data: subscriptionData } = useSubscription();
  const { data: usageData } = useUsage();
  const planKnown = subscriptionData !== undefined || usageData !== undefined;
  const isPaid =
    (subscriptionData?.subscription && subscriptionData.subscription.planPrice > 0) ||
    (usageData?.brandLimit !== null && usageData?.brandLimit !== undefined && usageData.brandLimit !== 1);
  const needsUpgrade = planKnown && !isPaid;

  // Unsaved edits only. Until something changes, the form shows what's
  // saved -- no effect copying server state into local state.
  const [draft, setDraft] = useState<Partial<ChatForm> | null>(null);
  const [newOrigin, setNewOrigin] = useState('');

  const saved: ChatForm = {
    enabled: Boolean(brand?.chatEnabled),
    origins: brand?.chatAllowedOrigins ?? [],
    greeting: brand?.chatGreeting ?? '',
    offlineMessage: brand?.chatOfflineMessage ?? '',
    hoursEnabled: Boolean(brand?.chatHoursEnabled),
    hours: brand?.chatHours ?? DEFAULT_HOURS(),
    alertWarning: brand?.chatAlertWarningSeconds ? String(brand.chatAlertWarningSeconds / 60) : '',
    alertCritical: brand?.chatAlertCriticalSeconds ? String(brand.chatAlertCriticalSeconds / 60) : '',
  };
  const form: ChatForm = { ...saved, ...draft };
  const { enabled, origins } = form;
  const set = (patch: Partial<ChatForm>) => setDraft((d) => ({ ...d, ...patch }));
  const setEnabled = (value: boolean) => set({ enabled: value });
  const setOrigins = (value: string[]) => set({ origins: value });
  const hasChanges = JSON.stringify(form) !== JSON.stringify(saved);

  const addOrigin = () => {
    let url: URL;
    try {
      url = new URL(newOrigin.trim());
    } catch {
      toast.error('Enter a full URL, like https://example.com');
      return;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      toast.error('Use an http or https address');
      return;
    }
    if (url.pathname !== '/' || url.search || url.hash) {
      toast.error('Enter just the site, without a path');
      return;
    }
    if (origins.includes(url.origin)) {
      toast.error('That site is already on the list');
      return;
    }
    setOrigins([...origins, url.origin]);
    setNewOrigin('');
  };

  const save = async () => {
    try {
      if (form.hoursEnabled && form.hours.days.length === 0) {
        toast.error('Pick at least one day for chat hours');
        return;
      }
      const minutes = (v: string) => (v.trim() ? Number(v) : null);
      const warning = minutes(form.alertWarning);
      const critical = minutes(form.alertCritical);
      // The API allows 30 seconds to a day.
      if ([warning, critical].some((m) => m !== null && !(m >= 0.5 && m <= 1440))) {
        toast.error('Alert times are between half a minute and 1440 minutes');
        return;
      }
      if ((critical ?? DEFAULT_ALERT_MINUTES.critical) <= (warning ?? DEFAULT_ALERT_MINUTES.warning)) {
        toast.error('The urgent alert has to come after the first one');
        return;
      }
      await updateBrand.mutateAsync({
        chatEnabled: enabled,
        chatAllowedOrigins: origins,
        chatGreeting: form.greeting.trim() || null,
        chatOfflineMessage: form.offlineMessage.trim() || null,
        chatHoursEnabled: form.hoursEnabled,
        ...(form.hoursEnabled && { chatHours: form.hours }),
        chatAlertWarningSeconds: warning === null ? null : Math.round(warning * 60),
        chatAlertCriticalSeconds: critical === null ? null : Math.round(critical * 60),
      });
      setDraft(null);
      toast.success('Chat settings saved');
    } catch {
      toast.error('Failed to save chat settings');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Chat</CardTitle>
              <CardDescription>
                Let visitors on your site start a conversation. Each conversation is a ticket.
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={!canManage || (needsUpgrade && !enabled)}
            aria-label="Enable chat"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canManage && (
          <p className="text-sm text-muted-foreground">
            Only organization owners and admins can change chat settings.
          </p>
        )}

        {needsUpgrade && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
            <p className="text-muted-foreground">
              {saved.enabled
                ? 'Chat is on, but visitors can no longer reach it: chat is available on paid plans.'
                : 'Chat is available on paid plans.'}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/billing">
                <Lock className="mr-2 h-4 w-4" />
                Upgrade
              </Link>
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label>Sites allowed to use chat</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://www.yoursite.com"
              value={newOrigin}
              disabled={!canManage}
              onChange={(e) => setNewOrigin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOrigin();
                }
              }}
            />
            <Button variant="outline" onClick={addOrigin} disabled={!canManage || !newOrigin.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Each address your site is served from, including www and staging, without a path.
          </p>
        </div>

        {origins.length > 0 && (
          <div className="space-y-2">
            {origins.map((origin) => (
              <div
                key={origin}
                className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <code className="text-sm">{origin}</code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={!canManage}
                  onClick={() => setOrigins(origins.filter((o) => o !== origin))}
                  aria-label={`Remove ${origin}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {enabled && origins.length === 0 && (
          <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Chat is on, but no site is allowed yet, so no visitor can connect. Add your site above.</p>
          </div>
        )}

        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <h4 className="text-sm font-medium">What visitors see</h4>
            <p className="text-sm text-muted-foreground">
              When nobody is set to Available or Busy (the status switch at the bottom of the
              sidebar), or chat is outside its hours, the widget shows your offline message.
              Visitors can still write; it waits for you as a ticket.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chat-greeting">Greeting</Label>
            <Textarea
              id="chat-greeting"
              rows={2}
              maxLength={500}
              placeholder="Hi! How can we help?"
              value={form.greeting}
              onChange={(e) => set({ greeting: e.target.value })}
              disabled={!canManage}
            />
            <p className="text-xs text-muted-foreground">
              The first message a visitor sees. A <code>data-greeting</code> on the script tag
              overrides it for that site.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chat-offline">Offline message</Label>
            <Textarea
              id="chat-offline"
              rows={2}
              maxLength={500}
              placeholder="We're away right now. Leave a message and we'll reply here as soon as we can."
              value={form.offlineMessage}
              onChange={(e) => set({ offlineMessage: e.target.value })}
              disabled={!canManage}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Chat hours</Label>
              <p className="text-sm text-muted-foreground">
                Outside these hours chat shows as closed, even if someone is online.
              </p>
            </div>
            <Switch
              checked={form.hoursEnabled}
              onCheckedChange={(v) => set({ hoursEnabled: v })}
              disabled={!canManage}
              aria-label="Limit chat to set hours"
            />
          </div>
          {form.hoursEnabled && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
                <div>
                  <Label className="text-xs">Opens</Label>
                  <Input
                    type="time"
                    value={form.hours.start}
                    onChange={(e) => set({ hours: { ...form.hours, start: e.target.value } })}
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <Label className="text-xs">Closes</Label>
                  <Input
                    type="time"
                    value={form.hours.end}
                    onChange={(e) => set({ hours: { ...form.hours, end: e.target.value } })}
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <Label className="text-xs">Timezone</Label>
                  <Input
                    value={form.hours.timezone}
                    onChange={(e) => set({ hours: { ...form.hours, timezone: e.target.value } })}
                    placeholder="America/Chicago"
                    disabled={!canManage}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((day, i) => {
                  const on = form.hours.days.includes(i);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!canManage}
                      aria-pressed={on}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      onClick={() =>
                        set({
                          hours: {
                            ...form.hours,
                            days: on ? form.hours.days.filter((d) => d !== i) : [...form.hours.days, i].sort(),
                          },
                        })
                      }
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                A closing time earlier than the opening time runs overnight, counted from the day it opens.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <h4 className="text-sm font-medium">Waiting alerts</h4>
            <p className="text-sm text-muted-foreground">
              How long a visitor can wait for a reply before the chat turns amber, then red, and
              your team is alerted. Leave blank for the default ({DEFAULT_ALERT_MINUTES.warning} and{' '}
              {DEFAULT_ALERT_MINUTES.critical} minutes).
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm">
            <div>
              <Label htmlFor="chat-alert-warning" className="text-xs">First alert after (minutes)</Label>
              <Input
                id="chat-alert-warning"
                type="number"
                min={0.5}
                max={1440}
                step="any"
                placeholder={String(DEFAULT_ALERT_MINUTES.warning)}
                value={form.alertWarning}
                onChange={(e) => set({ alertWarning: e.target.value })}
                disabled={!canManage}
              />
            </div>
            <div>
              <Label htmlFor="chat-alert-critical" className="text-xs">Urgent after (minutes)</Label>
              <Input
                id="chat-alert-critical"
                type="number"
                min={0.5}
                max={1440}
                step="any"
                placeholder={String(DEFAULT_ALERT_MINUTES.critical)}
                value={form.alertCritical}
                onChange={(e) => set({ alertCritical: e.target.value })}
                disabled={!canManage}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label>Install</Label>
          <p className="text-sm text-muted-foreground">
            Paste this into every page that should show chat, just before{' '}
            <code className="text-xs">&lt;/body&gt;</code>. It only works on the sites listed above.
          </p>
          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="next">Next.js / React</TabsTrigger>
              <TabsTrigger value="identity">Signed-in users</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
            </TabsList>
            <TabsContent value="html" className="mt-3">
              <CodeBlock code={htmlSnippet(brandId)} label="Snippet" />
            </TabsContent>
            <TabsContent value="next" className="mt-3">
              <CodeBlock code={nextSnippet(brandId)} label="Snippet" />
            </TabsContent>
            <TabsContent value="identity" className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>
                If visitors are signed in to your app, have your server vouch for them. Their chats
                then link to the real contact, agents see who they are, and replies are emailed if
                they leave. Without this every visitor is anonymous.
              </p>
              <CodeBlock code={identityServerSnippet(brandId)} label="Server code" />
              <CodeBlock code={IDENTITY_CLIENT_SNIPPET} label="Browser code" />
              <p>
                Mint the token on your server only: it needs an API key, which must never reach the
                browser. Call <code className="text-xs">reset()</code> on sign-out, or the next person
                on a shared computer would see the conversation.
              </p>
            </TabsContent>
            <TabsContent value="options" className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>Optional attributes on the script tag:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><code className="text-xs">data-title</code>: panel header (default &quot;Chat with us&quot;)</li>
                <li><code className="text-xs">data-greeting</code>: first message shown to the visitor (overrides the greeting above)</li>
                <li><code className="text-xs">data-color</code>: any CSS color, e.g. <code className="text-xs">#7c3aed</code></li>
                <li><code className="text-xs">data-position</code>: <code className="text-xs">left</code> or <code className="text-xs">right</code></li>
              </ul>
              <p>
                Sites with a Content Security Policy need{' '}
                <code className="text-xs">script-src {new URL(WIDGET_URL).origin}</code> and{' '}
                <code className="text-xs">connect-src {API_ORIGIN}</code>.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Visitors are anonymous unless your app vouches for them (see &ldquo;Signed-in
            users&rdquo; above). A typed email address is shown to agents as unverified and replies
            are never sent to it: anyone can type anyone&apos;s address. A reply reaches the visitor
            while they&apos;re on your site; if they&apos;ve left, it waits in the conversation, and
            verified visitors are also emailed.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
            </p>
            <Button onClick={save} disabled={updateBrand.isPending || !hasChanges}>
              {updateBrand.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
