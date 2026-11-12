import { SignIn } from '@clerk/nextjs';
import { headers } from 'next/headers';

/**
 * Where to land after signing in. Always the dashboard, except one case: the
 * Connect to Dispatch consent screen sends people here with its own URL in
 * `redirect_url`, and has to get them back with its query string intact.
 * Only that path, only on this host -- anything else would be an open redirect.
 */
const RETURNABLE_PATH = '/integrations/authorize';

async function afterSignIn(redirectUrl: string | undefined): Promise<string> {
  if (!redirectUrl) return '/';
  const host = (await headers()).get('host');
  try {
    const url = new URL(redirectUrl, `https://${host ?? 'invalid.local'}`);
    if (url.host === host && url.pathname === RETURNABLE_PATH) return `${url.pathname}${url.search}`;
  } catch {
    // Not a URL: fall through to the dashboard.
  }
  return '/';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
}) {
  const { redirect_url } = await searchParams;
  const target = await afterSignIn(Array.isArray(redirect_url) ? redirect_url[0] : redirect_url);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignIn
        routing="hash"
        signUpUrl="https://dispatchtickets.com/signup/"
        forceRedirectUrl={target}
      />
    </div>
  );
}
