'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SignedIn, SignedOut, UserButton, OrganizationSwitcher } from '@clerk/nextjs';
import { useAuth } from '@/providers';
import { useProfile, useBrands, useDashboardStats, useDashboardTickets } from '@/lib/hooks';
import { useGlobalChatQueue } from '@/lib/hooks/use-chat';
import { useSidebarCollapsed } from '@/lib/ui-prefs';
import { BrandList } from './brand-list';
import { OrgSwitcher } from './org-switcher';
import { NotificationBell } from './notification-bell';
import {
  SidebarCollapsedProvider,
  SidebarSection,
  SidebarSectionHeader,
  NavItem,
} from './sidebar-nav';
import { AvailabilityToggle } from '@/components/presence/availability-toggle';
import type { PaginatedResponse } from '@/types';
import {
  Inbox,
  User,
  AlertCircle,
  Key,
  Plug,
  Rocket,
  BarChart3,
  Users,
  CreditCard,
  LifeBuoy,
  Lightbulb,
  LogOut,
  UserCog,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

/** Every sidebar glyph is the same weight and size, per the design. */
const ICON = 'h-[18px] w-[18px]';

/** The API caps a page at 100, so a full page means "at least this many". */
const PAGE_LIMIT = 100;

function countFrom(result: PaginatedResponse<unknown> | undefined): number | string | undefined {
  if (!result) return undefined;
  const n = result.data.length;
  return result.pagination?.hasMore || n >= PAGE_LIMIT ? `${PAGE_LIMIT}+` : n;
}

export function Sidebar({ collapsible = true }: { collapsible?: boolean } = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session, logout } = useAuth();
  const { data: profile } = useProfile();
  const { data: brands } = useBrands();
  const email = session?.email;

  // The rail is a desktop affordance. The mobile sheet renders this same
  // component and is always full width, so it opts out entirely.
  const [storedCollapsed, toggleCollapsed] = useSidebarCollapsed();
  const collapsed = collapsible && storedCollapsed;

  // Dashboard state from URL
  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard');
  const view = searchParams.get('view') || 'all';

  // Queue counts (and the per-brand counts in BrandList) need these everywhere.
  const { data: stats } = useDashboardStats();

  const hasBrands = !!brands && brands.length > 0;

  // Fetch my active tickets count using memberId
  const { data: myTicketsData } = useDashboardTickets(
    session?.memberId
      ? { assigneeId: session.memberId, status: 'active', limit: PAGE_LIMIT }
      : undefined,
    { enabled: !!session?.memberId }
  );

  // "null" is how the cross-brand endpoint spells unassigned; the dashboard's
  // own Unassigned view uses the same value.
  const { data: unassignedData } = useDashboardTickets(
    { assigneeId: 'null', status: 'active', limit: PAGE_LIMIT },
    { enabled: hasBrands }
  );

  // Chats across every brand this member can reach. The count is what makes
  // the row worth having: a visitor waiting on brand C is invisible while you
  // are reading brand A.
  const { data: chatData } = useGlobalChatQueue(hasBrands);
  const waitingChats = (chatData?.data ?? []).filter((t) => t.awaitingReplySince).length;

  const activeCount = (stats?.open || 0) + (stats?.pending || 0);

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

  return (
    <SidebarCollapsedProvider value={collapsed}>
      <div
        className={cn(
          'bg-card flex h-full flex-col border-r transition-[width] duration-150',
          collapsed ? 'w-[68px]' : 'w-[264px]'
        )}
      >
        <div
          className={cn(
            'flex shrink-0 border-b',
            collapsed
              ? 'flex-col items-center gap-1 px-2 py-3'
              : 'h-16 items-center justify-between pr-4 pl-5'
          )}
        >
          <Link href="/dashboard" className="flex items-center" aria-label="Dispatch Tickets">
            <Image
              src={collapsed ? '/icon.svg' : '/logo.svg'}
              alt="Dispatch Tickets"
              width={collapsed ? 26 : 160}
              height={collapsed ? 26 : 22}
              priority
            />
          </Link>
          <div className={cn('flex items-center', collapsed && 'flex-col')}>
            <NotificationBell />
            {collapsible && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleCollapsed}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <PanelLeftOpen className={ICON} />
                ) : (
                  <PanelLeftClose className={ICON} />
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          {/* When no brands exist, show Getting Started prominently at top */}
          {!hasBrands && (
            <SidebarSection>
              <nav className="space-y-0.5">
                <NavItem
                  href="/getting-started"
                  icon={<Rocket className={ICON} />}
                  label="Getting Started"
                  active={pathname === '/getting-started'}
                />
              </nav>
            </SidebarSection>
          )}

          {/* Dashboard Views - only show when brands exist */}
          {hasBrands && (
            <>
              <SidebarSection>
                <SidebarSectionHeader>Queue</SidebarSectionHeader>
                <nav className="space-y-0.5">
                  <NavItem
                    href="/dashboard"
                    icon={<Inbox className={ICON} />}
                    label="All Active"
                    active={isDashboard && view === 'all'}
                    count={activeCount}
                  />
                  <NavItem
                    href="/dashboard?view=mine"
                    icon={<User className={ICON} />}
                    label="My Tickets"
                    active={isDashboard && view === 'mine'}
                    count={countFrom(myTicketsData)}
                  />
                  <NavItem
                    href="/dashboard?view=unassigned"
                    icon={<AlertCircle className={ICON} />}
                    label="Unassigned"
                    active={isDashboard && view === 'unassigned'}
                    count={countFrom(unassignedData)}
                  />
                  <NavItem
                    href="/chat"
                    icon={<MessageSquare className={ICON} />}
                    label="Chat"
                    active={pathname === '/chat'}
                    badgeCount={waitingChats}
                  />
                  <NavItem
                    href="/stats"
                    icon={<BarChart3 className={ICON} />}
                    label="Statistics"
                    active={pathname === '/stats'}
                  />
                </nav>
              </SidebarSection>

              {/* Flat brand list with active-ticket counts */}
              <BrandList />
            </>
          )}

          <SidebarSection className="border-b-0">
            <SidebarSectionHeader>Workspace</SidebarSectionHeader>
            <nav className="space-y-0.5">
              <NavItem
                href="/team"
                icon={<Users className={ICON} />}
                label="Team"
                active={pathname === '/team'}
              />
              {(session?.orgRole === 'owner' || session?.orgRole === 'admin') && (
                <NavItem
                  href="/api-keys"
                  icon={<Key className={ICON} />}
                  label="API Keys"
                  active={pathname === '/api-keys'}
                />
              )}
              {(session?.orgRole === 'owner' || session?.orgRole === 'admin') && (
                <NavItem
                  href="/integrations"
                  icon={<Plug className={ICON} />}
                  label="Integrations"
                  active={pathname === '/integrations'}
                />
              )}
              {session?.orgRole === 'owner' && (
                <NavItem
                  href="/billing"
                  icon={<CreditCard className={ICON} />}
                  label="Billing"
                  active={pathname === '/billing'}
                />
              )}
              <NavItem
                href="/support"
                icon={<LifeBuoy className={ICON} />}
                label="Support"
                active={pathname === '/support'}
              />
              <NavItem
                href="/feature-requests"
                icon={<Lightbulb className={ICON} />}
                label="Feature Requests"
                active={pathname === '/feature-requests'}
              />
            </nav>
          </SidebarSection>
        </div>

        {/* Org switcher.
            • Clerk users: Clerk's <OrganizationSwitcher /> (drives the JWT's
              org_id claim — the API uses that to scope data).
            • Stackbe users: the legacy OrgSwitcher (Stackbe API + session).

            HIDDEN ON THE RAIL. Both switchers render an avatar, a name and a
            chevron, and Clerk's appearance API gives no way to drop to the
            avatar alone — cramming it into 68px crops it. Switching org is
            rare and expanding costs one click, so the rail drops it rather
            than showing something broken.

            "Manage" is pointed at OUR team page (organizationProfileMode
            "navigation"), because Clerk's <OrganizationProfile /> is member
            management we do not control. Any org:admin can invite and remove
            people there, and Clerk has no owner role -- it sees the account
            owner as one more admin, so an admin could remove them. Worse, it
            never touches the API, so none of the departure cleanup runs: the
            leaver keeps receiving customer email (TicketWatcher rows) and their
            tickets stay assigned to someone who is gone. Removal has to go
            through DELETE /v1/auth/members/:id, which refuses to remove an OWNER
            and runs offboardMember() -- see api tickets/member-offboarding.ts.
            Clerk has no prop to hide the button, so it is redirected instead.

            THIS IS NOT ENFORCEMENT. It removes the path people would find, not
            the capability: org:admin still holds org:sys_memberships:manage, and
            the Clerk Account Portal serves the same panel at
            accounts.dispatchtickets.com/organization-profile to anyone signed
            in. Taking the capability away means dropping that permission from
            the org:admin role in Clerk (which also takes it from the owner --
            Clerk cannot tell them apart -- and is survivable only because our
            API calls Clerk with the secret key, which ignores org permissions).
            Until then, the backstop is the organizationMembership.deleted
            webhook, which runs the same cleanup for a removal that never
            touched the API. */}
        {!collapsed && (
          <div className="shrink-0 border-t px-3 py-2">
            <SignedIn>
              <OrganizationSwitcher
                hidePersonal
                organizationProfileMode="navigation"
                organizationProfileUrl="/team"
                afterSelectOrganizationUrl="/"
                afterCreateOrganizationUrl="/"
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    organizationSwitcherTrigger:
                      'w-full justify-between text-xs h-8 px-2',
                  },
                }}
              />
            </SignedIn>
            <SignedOut>
              <OrgSwitcher />
            </SignedOut>
          </div>
        )}

        {/* Profile section — Clerk users see <UserButton />; Stackbe users see
            the legacy dropdown. Clerk's <SignedOut> treats Stackbe-authenticated
            sessions as "signed-out" since Clerk has no session for them, which is
            exactly the routing we want during the parallel-mode period. */}
        <div className={cn('shrink-0 border-t', collapsed ? 'px-2 py-2.5' : 'px-3 py-3')}>
          <SignedIn>
            <div
              className={cn(
                'flex items-center',
                collapsed ? 'flex-col gap-1.5' : 'gap-2.5 px-1'
              )}
            >
              <UserButton
                appearance={{ elements: { rootBox: 'flex items-center' } }}
                afterSignOutUrl="/login"
              />
              {!collapsed && (
                <Link
                  href="/profile"
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                >
                  {displayName}
                </Link>
              )}
              <AvailabilityToggle variant={collapsed ? 'dot' : 'pill'} />
            </div>
          </SignedIn>
          <SignedOut>
            <div className={cn('flex items-center', collapsed ? 'flex-col gap-1.5' : 'gap-2')}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      collapsed ? 'h-8 w-8 p-0' : 'min-w-0 flex-1 justify-start gap-2.5 px-1'
                    )}
                    title={collapsed ? displayName : undefined}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.avatarUrl || undefined} alt={displayName} />
                      <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                      <span className="truncate text-sm font-medium">{displayName}</span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start" side="top">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-muted-foreground truncate text-xs">{email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/profile">
                      <UserCog className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AvailabilityToggle variant={collapsed ? 'dot' : 'pill'} />
            </div>
          </SignedOut>
        </div>
      </div>
    </SidebarCollapsedProvider>
  );
}
