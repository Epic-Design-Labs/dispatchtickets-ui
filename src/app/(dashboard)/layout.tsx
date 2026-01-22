'use client';

import { useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/providers';
import { Sidebar } from '@/components/layout';
import { KeyboardShortcutsModal } from '@/components/keyboard-shortcuts-modal';
import { ConnectionWarningBanner } from '@/components/connection-warning-banner';
import { useKeyboardShortcuts, useMentionNotifications, useBrands, useProfile, useGlobalTicketNotifications } from '@/lib/hooks';

// Separate component to enable mention polling only when authenticated
function MentionNotificationPoller() {
  useMentionNotifications();
  return null;
}

// Initialize desktop notification localStorage from profile on app load
function DesktopNotificationInitializer() {
  const { data: profile } = useProfile();

  useEffect(() => {
    if (profile && typeof window !== 'undefined') {
      // Sync profile's notifyDesktop setting to localStorage
      // This ensures the notification hook has the correct value
      localStorage.setItem('desktop_notifications_enabled', String(profile.notifyDesktop ?? false));
    }
  }, [profile]);

  return null;
}

// Global ticket notifications - polls all brands for new tickets/comments
function GlobalTicketNotificationPoller() {
  useGlobalTicketNotifications();
  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { isAuthenticated, isConnected, isLoading } = useAuth();
  const brandId = params.brandId as string | undefined;
  const { data: brands, isLoading: brandsLoading } = useBrands();

  // Global keyboard shortcuts (just ? for help modal, handled in the hook)
  useKeyboardShortcuts([]);

  // Auth redirects
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (!isConnected) {
        router.replace('/connect');
      }
    }
  }, [isAuthenticated, isConnected, isLoading, router]);

  // Redirect to getting-started when no brands exist (unless already there or on allowed pages)
  useEffect(() => {
    if (!isLoading && !brandsLoading && isAuthenticated && isConnected) {
      const hasBrands = brands && brands.length > 0;
      const isOnGettingStarted = pathname === '/getting-started';
      const isOnAllowedPage = pathname === '/profile' || pathname === '/team' ||
                              pathname === '/billing' || pathname === '/api-keys' ||
                              pathname === '/support' || pathname === '/feature-requests';

      if (!hasBrands && !isOnGettingStarted && !isOnAllowedPage) {
        router.replace('/getting-started');
      }
    }
  }, [isLoading, brandsLoading, isAuthenticated, isConnected, brands, pathname, router]);

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
      <DesktopNotificationInitializer />
      <GlobalTicketNotificationPoller />
      <Sidebar brandId={brandId} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ConnectionWarningBanner />
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
      <KeyboardShortcutsModal />
    </div>
  );
}
