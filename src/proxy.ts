import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * Clerk middleware for the admin app.
 *
 * The admin is dual-mode (Phase 1c): existing Stackbe customers authenticate
 * via the legacy magic-link flow; new Clerk-signup users authenticate via this
 * middleware. We do NOT call createRouteMatcher to gate routes — the existing
 * AuthProvider handles route protection client-side, and the API enforces
 * authorization server-side. This middleware exists so Clerk's <ClerkProvider>
 * can read auth state from the request context on every page load.
 *
 * When Stackbe is fully removed (Phase 1e), we'll add createRouteMatcher to
 * gate /(dashboard)/* server-side and remove the client-side auth-provider
 * fallback.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on every page route except Next internals and static assets.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Run on API routes too (the few there are — see admin/src/app/api/).
    '/(api|trpc)(.*)',
  ],
};
