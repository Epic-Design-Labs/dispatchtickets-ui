'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useClerkAuth } from '@clerk/nextjs';

export default function HomePage() {
  const router = useRouter();
  const clerk = useClerkAuth();

  // Treat Clerk-signed-in users as authenticated. Wait for Clerk to finish
  // loading before deciding — otherwise we redirect to /login while Clerk
  // is still hydrating its session cookie and we get a loop.
  const clerkReady = clerk.isLoaded;
  const isAuthenticated = clerk.isSignedIn === true;
  const isLoading = !clerkReady;

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Land on the All Active queue, not the brand picker. Someone opening
        // the app wants the work, not a list of containers. The dashboard
        // layout still bounces to /getting-started when no brands exist.
        router.replace('/dashboard');
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
