import { createInvoiceProxyHandler } from '@usethrottle/invoices/server';

/**
 * Customer-facing invoice proxy for @usethrottle/invoices.
 *
 * GET-only, path-allowlisted, ownership-checked proxy (provided by the package)
 * that holds the Throttle secret key server-side. The browser never sees it.
 *
 * `getCustomerId` resolves the signed-in DT user to the externalId on their
 * Throttle customer record (= the DT Account / organizationId). The browser
 * sends the DT session token (Stackbe session token OR Clerk JWT) as a Bearer
 * header via the invoice fetcher; we forward it to the DT API session endpoint
 * to read `organizationId`. Returns null when unauthenticated -> proxy 401s.
 */

// NEXT_PUBLIC_API_URL already includes the `/v1` prefix (e.g.
// https://dispatch-tickets-api.onrender.com/v1).
const DT_API = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';

async function getCustomerId(request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  try {
    const res = await fetch(`${DT_API}/auth/session`, {
      headers: { Authorization: authorization },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as
      | { organizationId?: string; data?: { organizationId?: string } }
      | null;
    const orgId = body?.organizationId ?? body?.data?.organizationId ?? null;
    return typeof orgId === 'string' && orgId.length > 0 ? orgId : null;
  } catch {
    return null;
  }
}

const handler = createInvoiceProxyHandler({
  apiKey: process.env.THROTTLE_SECRET_KEY ?? '',
  baseUrl: process.env.THROTTLE_API_BASE || 'https://api.usethrottle.dev',
  getCustomerId,
});

// Next.js 16 passes dynamic route params as a Promise; the package expects a
// resolved `{ params: { path } }`, so await + adapt here.
export async function GET(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return handler(request, { params: { path: path ?? [] } });
}

export const dynamic = 'force-dynamic';
