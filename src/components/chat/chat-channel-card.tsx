'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Copy, Globe, Info, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useBrand, useUpdateBrand } from '@/lib/hooks';
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

export function ChatChannelCard({ brandId }: { brandId: string }) {
  const { data: brand, isLoading } = useBrand(brandId);
  const updateBrand = useUpdateBrand(brandId);
  const { session } = useAuth();
  const role = (session?.orgRole ?? '').toLowerCase();
  const canManage = role === 'owner' || role === 'admin';

  // Unsaved edits only. Until something changes, the form shows what's
  // saved -- no effect copying server state into local state.
  const [draft, setDraft] = useState<{ enabled: boolean; origins: string[] } | null>(null);
  const [newOrigin, setNewOrigin] = useState('');

  const savedEnabled = Boolean(brand?.chatEnabled);
  const savedOrigins = brand?.chatAllowedOrigins ?? [];
  const enabled = draft?.enabled ?? savedEnabled;
  const origins = draft?.origins ?? savedOrigins;
  const setEnabled = (value: boolean) => setDraft({ enabled: value, origins });
  const setOrigins = (value: string[]) => setDraft({ enabled, origins: value });
  const hasChanges =
    enabled !== savedEnabled || JSON.stringify(origins) !== JSON.stringify(savedOrigins);

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
      await updateBrand.mutateAsync({ chatEnabled: enabled, chatAllowedOrigins: origins });
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
            disabled={!canManage}
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
                <li><code className="text-xs">data-greeting</code>: first message shown to the visitor</li>
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
