'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setClerkTokenGetter } from '@/lib/api/client';

/**
 * Side-effect-only component that wires Clerk's async getToken() into the
 * axios client at module level. Renders nothing.
 *
 * Mounted inside <ClerkProvider> so useAuth() is available.
 */
export function ClerkTokenBridge() {
  const { getToken, isLoaded } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    setClerkTokenGetter(() => getToken());
    return () => setClerkTokenGetter(null);
  }, [getToken, isLoaded]);
  return null;
}
