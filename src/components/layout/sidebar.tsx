'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/providers';
import { useProfile, useBrands, useDashboardStats, useDashboardTickets, useSetupStatus } from '@/lib/hooks';
import { BrandSwitcher } from './brand-switcher';
import { NotificationBell } from './notification-bell';
import { Inbox, User, AlertCircle, Key, Rocket, Check, BarChart3 } from 'lucide-react';

interface SidebarProps {
  brandId?: string;
}

export function Sidebar({ brandId }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session, logout } = useAuth();
  const { data: profile } = useProfile();
  const { data: brands } = useBrands();
  const email = session?.email;

  // Dashboard state from URL
  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard');
  const view = searchParams.get('view') || 'all';

  // Only fetch stats when on dashboard (for queue counts)
  const { data: stats } = useDashboardStats(isDashboard ? [] : undefined);

  // Fetch my tickets count using memberId
  const { data: myTicketsData } = useDashboardTickets(
    session?.memberId ? { assigneeId: session.memberId, status: 'active', limit: 100 } : undefined
  );
  const myTicketsCount = myTicketsData?.data?.length ?? 0;

  // Setup status for brand-specific Getting Started badge
  const setupStatus = useSetupStatus(brandId || '');

  // Get display name: profile > email-derived > email
  const displayName = profile?.displayName || (email ? email.split('@')[0].split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : 'User');

  // Get initials for avatar fallback
  const getInitials = () => {
    if (profile?.displayName) {
      return profile.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const navigation = brandId
    ? [
        {
          name: 'Tickets',
          href: `/brands/${brandId}/tickets`,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          ),
        },
        {
          name: 'Customers',
          href: `/brands/${brandId}/customers`,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          ),
        },
        {
          name: 'Companies',
          href: `/brands/${brandId}/companies`,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          name: 'Spam',
          href: `/brands/${brandId}/spam`,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ),
        },
        {
          name: 'Settings',
          href: `/brands/${brandId}/settings`,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
        {
          name: 'Getting Started',
          href: `/brands/${brandId}/getting-started`,
          icon: <Rocket className="h-4 w-4" />,
          badge: setupStatus.percentComplete < 100 && !setupStatus.isLoading
            ? `${setupStatus.completedCount}/${setupStatus.requiredCount}`
            : setupStatus.percentComplete === 100
            ? <Check className="h-3 w-3" />
            : undefined,
        },
      ]
    : [];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/logo.svg"
            alt="Dispatch Tickets"
            width={160}
            height={22}
            priority
          />
        </Link>
        <NotificationBell />
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {/* Dashboard Views */}
        <div className="px-3 mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
            Queue
          </h3>
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors',
                isDashboard && view === 'all'
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Inbox className="h-4 w-4" />
              All Active
              {isDashboard && stats && (
                <span className="ml-auto text-xs opacity-70">{(stats.open || 0) + (stats.pending || 0)}</span>
              )}
            </Link>
            <Link
              href="/dashboard?view=mine"
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors',
                isDashboard && view === 'mine'
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <User className="h-4 w-4" />
              My Tickets
              {myTicketsCount > 0 && (
                <span className="ml-auto text-xs opacity-70">{myTicketsCount}</span>
              )}
            </Link>
            <Link
              href="/dashboard?view=unassigned"
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors',
                isDashboard && view === 'unassigned'
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <AlertCircle className="h-4 w-4" />
              Unassigned
            </Link>
            <Link
              href="/stats"
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors',
                pathname === '/stats'
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Statistics
            </Link>
          </nav>
        </div>

        <Separator className="mb-4" />

        {/* Brand Switcher (for brand-specific pages) */}
        <div className="px-3">
          <BrandSwitcher />
        </div>

        {brandId && (
          <>
            <Separator className="my-4" />
            <nav className="space-y-1 px-3">
              {navigation.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Button
                    key={item.name}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-2',
                      isActive && 'bg-secondary'
                    )}
                    asChild
                  >
                    <Link href={item.href}>
                      {item.icon}
                      {item.name}
                      {item.badge && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </Button>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Organization section */}
      <div className="border-t p-3">
        <nav className="space-y-1">
          <Button
            variant={pathname === '/team' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start gap-2',
              pathname === '/team' && 'bg-secondary'
            )}
            asChild
          >
            <Link href="/team">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Team
            </Link>
          </Button>
          <Button
            variant={pathname === '/api-keys' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start gap-2',
              pathname === '/api-keys' && 'bg-secondary'
            )}
            asChild
          >
            <Link href="/api-keys">
              <Key className="h-4 w-4" />
              API Keys
            </Link>
          </Button>
          {session?.orgRole === 'owner' && (
            <Button
              variant={pathname === '/billing' ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-2',
                pathname === '/billing' && 'bg-secondary'
              )}
              asChild
            >
              <Link href="/billing">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                Billing
              </Link>
            </Button>
          )}
        </nav>
      </div>

      {/* Support section */}
      <div className="border-t p-3">
        <nav className="space-y-1">
          <Button
            variant={pathname === '/getting-started' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start gap-2',
              pathname === '/getting-started' && 'bg-secondary'
            )}
            asChild
          >
            <Link href="/getting-started">
              <Rocket className="h-4 w-4" />
              Getting Started
            </Link>
          </Button>
          <Button
            variant={pathname === '/support' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start gap-2',
              pathname === '/support' && 'bg-secondary'
            )}
            asChild
          >
            <Link href="/support">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Support
            </Link>
          </Button>
          <Button
            variant={pathname === '/feature-requests' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start gap-2',
              pathname === '/feature-requests' && 'bg-secondary'
            )}
            asChild
          >
            <Link href="/feature-requests">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Feature Requests
            </Link>
          </Button>
        </nav>
      </div>

      {/* Profile section */}
      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile?.avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start" side="top">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/profile">
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
