import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * Clerk middleware for the admin app.
 *
 * Clerk is the only sign-in. We do NOT call createRouteMatcher to gate routes:
 * the dashboard layout redirects signed-out visitors client-side, and the API
 * enforces all authorization server-side (this UI is open source, so nothing
 * here is a security boundary). The middleware exists so <ClerkProvider> can
 * read auth state from the request context on every page load.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on every page route except Next internals, static assets, and the
    // invoice proxy (/api/throttle) — that route authenticates itself by
    // forwarding the caller's token to the DT API, and Clerk's verifier crashes
    // on Bearer tokens it did not issue.
    '/((?!_next|api/throttle|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Run on API routes too (the few there are — see admin/src/app/api/), but
    // not the self-authenticating invoice proxy.
    '/(api(?!/throttle)|trpc)(.*)',
  ],
};
