'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useStackbeAuth } from '@/providers';
import { useAuth as useClerkAuth } from '@clerk/nextjs';

export default function HomePage() {
  const router = useRouter();
  const stackbe = useStackbeAuth();
  const clerk = useClerkAuth();

  // Treat Clerk-signed-in users as authenticated. Wait for Clerk to finish
  // loading before deciding — otherwise we redirect to /login while Clerk
  // is still hydrating its session cookie and we get a loop.
  const clerkReady = clerk.isLoaded;
  const isAuthenticated = clerk.isSignedIn === true || stackbe.isAuthenticated;
  const isLoading = !clerkReady || (clerk.isSignedIn === false && stackbe.isLoading);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/getting-started');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}
