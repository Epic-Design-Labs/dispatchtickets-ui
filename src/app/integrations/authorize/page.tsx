'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth as useClerkAuth, useClerk } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { integrationsApi } from '@/lib/api/integrations';

/**
 * Connect to Dispatch: the consent screen a third-party integration sends a
 * customer's admin to. Standalone (no dashboard chrome) and outside the
 * dashboard layout, whose sign-in redirect would drop this URL's query string.
 *
 * Every rule is enforced by the API (owner/admin session, registered redirect,
 * brands in this account). This page only shows the decision and carries it.
 */
export default function AuthorizeIntegrationPage() {
  return (
    <Suspense fallback={<Centered><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></Centered>}>
      <Authorize />
    </Suspense>
  );
}

function errorText(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const message = Array.isArray(data?.message) ? data?.message.join(', ') : data?.message;
  return message || 'Something went wrong. Try again from the integration.';
}

function Authorize() {
  const params = useSearchParams();
  const clientId = params.get('client_id') ?? '';
  const redirectUri = params.get('redirect_uri') ?? '';
  const state = params.get('state') ?? undefined;
  const codeChallenge = params.get('code_challenge') ?? undefined;
  const codeChallengeMethod = params.get('code_challenge_method') ?? undefined;

  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useClerkAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Back to this exact URL after signing in, query string included.
      void clerk.redirectToSignIn({ signInForceRedirectUrl: window.location.href });
    }
  }, [isLoaded, isSignedIn, clerk]);

  const preview = useQuery({
    queryKey: ['integrations', 'authorize', clientId, redirectUri],
    queryFn: () => integrationsApi.preview(clientId, redirectUri),
    enabled: Boolean(isSignedIn && clientId && redirectUri),
    retry: false,
  });

  const [selected, setSelected] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const brandIds = useMemo(() => {
    if (selected) return selected;
    const data = preview.data;
    if (!data) return [];
    // Pre-tick only what an earlier approval already allowed. A first connect
    // starts with nothing ticked, even with one brand, so Connect is never a
    // single click (defence in depth alongside the no-framing headers).
    return data.currentBrandIds;
  }, [selected, preview.data]);

  if (!clientId || !redirectUri) {
    return (
      <Problem title="This link is incomplete">
        The integration didn&apos;t say who it is or where to return. Start again from the integration&apos;s
        &ldquo;Connect to Dispatch&rdquo; button.
      </Problem>
    );
  }

  if (!isLoaded || !isSignedIn || preview.isLoading) {
    return <Centered><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></Centered>;
  }

  if (preview.isError || !preview.data) {
    const status = (preview.error as { response?: { status?: number } })?.response?.status;
    return (
      <Problem title={status === 403 ? 'Ask an owner or admin' : "This integration can't connect"}>
        {status === 403
          ? 'Only owners and admins can connect integrations to this account.'
          : errorText(preview.error)}
      </Problem>
    );
  }

  const { app, account, brands } = preview.data;

  const toggle = (id: string) =>
    setSelected((brandIds.includes(id) ? brandIds.filter((b) => b !== id) : [...brandIds, id]));

  // Only reachable once the preview confirmed redirect_uri is registered for this app.
  const deny = () => {
    const back = new URL(redirectUri);
    back.searchParams.set('error', 'access_denied');
    if (state !== undefined) back.searchParams.set('state', state);
    window.location.assign(back.toString());
  };

  const approve = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { redirectUrl } = await integrationsApi.approve({
        client_id: clientId,
        redirect_uri: redirectUri,
        brandIds,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
      });
      window.location.assign(redirectUrl);
    } catch (err) {
      setSubmitError(errorText(err));
      setSubmitting(false);
    }
  };

  return (
    <Centered>
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          {app.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <Plug className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">
              Connect {app.name} to {account?.name ?? 'your account'}
            </h1>
            {app.homepageUrl && (
              <a href={app.homepageUrl} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline break-all">
                {new URL(app.homepageUrl).host}
              </a>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">On the brands you choose, {app.name} will be able to:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Read, create and update tickets, and reply to customers as your agents</li>
            <li>See which team members handle those brands, and set their availability</li>
            <li>Receive events about them, and add buttons to their chat widget</li>
            <li>Add custom ticket fields</li>
          </ul>
          <p className="text-muted-foreground">
            It can&apos;t delete tickets or brands, change brand or email settings, add people to email
            threads, see other brands, or manage your team, API keys or billing. It can only change or
            remove webhooks and chat buttons it created.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium mb-2">Brands it can reach</legend>
          {brands.length === 0 ? (
            <p className="text-sm text-muted-foreground">This account has no brands yet. Create one first.</p>
          ) : (
            brands.map((brand) => (
              <label key={brand.id} htmlFor={`brand-${brand.id}`} className="flex items-center gap-3 text-sm cursor-pointer">
                <Checkbox
                  id={`brand-${brand.id}`}
                  checked={brandIds.includes(brand.id)}
                  onCheckedChange={() => toggle(brand.id)}
                />
                {brand.name}
              </label>
            ))
          )}
        </fieldset>

        {submitError && (
          <p role="alert" className="text-sm text-destructive">{submitError}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={deny} disabled={submitting}>Cancel</Button>
          <Button onClick={approve} disabled={submitting || brandIds.length === 0}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Connect
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          You can change its brands or disconnect it any time in Dispatch under Integrations.
        </p>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-4">{children}</div>;
}

function Problem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Centered>
      <div className="w-full max-w-md rounded-xl border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </Centered>
  );
}
