'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/providers';
import { Sidebar } from '@/components/layout';
import { KeyboardShortcutsModal } from '@/components/keyboard-shortcuts-modal';
import { ConnectionWarningBanner } from '@/components/connection-warning-banner';
import { useKeyboardShortcuts, useMentionNotifications } from '@/lib/hooks';

// Separate component to enable mention polling only when authenticated
function MentionNotificationPoller() {
  useMentionNotifications();
  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, isConnected, isLoading } = useAuth();
  const brandId = params.brandId as string | undefined;

  // Global keyboard shortcuts (just ? for help modal, handled in the hook)
  useKeyboardShortcuts([]);


  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (!isConnected) {
        router.replace('/connect');
      }
    }
  }, [isAuthenticated, isConnected, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Redirecting to login...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Redirecting to connect...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <MentionNotificationPoller />
      <Sidebar brandId={brandId} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ConnectionWarningBanner />
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
      <KeyboardShortcutsModal />
    </div>
  );
}
