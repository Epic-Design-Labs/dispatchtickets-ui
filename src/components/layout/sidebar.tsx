'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { useProfile } from '@/lib/hooks';
import { BrandSwitcher } from './brand-switcher';

interface SidebarProps {
  workspaceId?: string;
}

export function Sidebar({ workspaceId }: SidebarProps) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { data: profile } = useProfile();
  const email = session?.email;

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

  const navigation = workspaceId
    ? [
        {
          name: 'Dashboard',
          href: `/brands/${workspaceId}`,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          name: 'Customers',
          href: `/brands/${workspaceId}/customers`,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          ),
        },
        {
          name: 'Companies',
          href: `/brands/${workspaceId}/companies`,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          name: 'Webhooks',
          href: `/brands/${workspaceId}/webhooks`,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          ),
        },
        {
          name: 'Settings',
          href: `/brands/${workspaceId}/settings`,
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ]
    : [];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/brands" className="flex items-center gap-2 font-semibold">
          <svg className="h-6 w-6" viewBox="0 0 95 95" fill="none">
            <rect x="33.3721" y="8.86157" width="32.9085" height="46.3896" transform="rotate(0.0597011 33.3721 8.86157)" fill="#F9B200"/>
            <rect x="52.7118" y="19.0376" width="32.9085" height="46.3896" transform="rotate(6.28711 52.7118 19.0376)" fill="#00CDFB"/>
            <path d="M64.6677 5.44141C66.8177 5.44165 68.5748 7.19861 68.575 9.34863V18.5908L84.0496 20.2139H84.0535C84.8817 20.3071 85.6473 20.6502 86.2546 21.1973L86.3015 21.1514L86.6921 21.6357C87.3433 22.4434 87.6415 23.4602 87.5378 24.4971V24.5L82.9832 67.8027V67.8066C82.8666 68.8425 82.3596 69.7811 81.5505 70.4336L81.5496 70.4326C80.8467 71.0044 79.9869 71.3057 79.1013 71.3057C78.9478 71.3057 78.8079 71.2907 78.6931 71.2803H78.6863L48.7126 68.1318H48.7097C46.5753 67.8975 45.0135 65.9727 45.2351 63.835V63.834L45.9744 56.793H34.5261C32.376 56.7928 30.6189 55.0359 30.6189 52.8857V9.34863C30.6191 7.19858 32.3761 5.44159 34.5261 5.44141H64.6677ZM53.7195 20.3857C53.5893 20.3707 53.4486 20.408 53.325 20.5059C53.2079 20.6071 53.1384 20.7337 53.1208 20.8818L53.1218 20.8828L48.5671 64.1855V64.1875C48.5342 64.4898 48.7536 64.7657 49.0662 64.7998H49.0652L79.0203 67.9463H79.0212C79.183 67.9587 79.3289 67.9149 79.4421 67.8232C79.5338 67.749 79.5942 67.6615 79.6267 67.5605L79.6404 67.4404L84.1951 24.1377V24.1318C84.21 24.0016 84.172 23.862 84.074 23.7383C83.9719 23.6204 83.8448 23.5509 83.6951 23.5342V23.5332L53.7244 20.3867L53.7195 20.3857ZM34.5261 8.79102C34.2208 8.79121 33.9687 9.04331 33.9685 9.34863V52.8857C33.9685 53.1912 34.2207 53.4432 34.5261 53.4434H46.3259L49.7781 20.543L49.7791 20.5391C49.8956 19.5033 50.4018 18.5646 51.2107 17.9121C52.0185 17.2607 53.0359 16.9617 54.073 17.0654H54.0759L65.2253 18.2393V9.34863C65.2252 9.04335 64.973 8.79126 64.6677 8.79102H34.5261Z" fill="black" stroke="black" strokeWidth="1.11678"/>
            <rect x="10.0632" y="40.601" width="32.9085" height="46.3896" transform="rotate(-20.6028 10.0632 40.601)" fill="#FA005D"/>
            <rect x="31.7497" y="43.298" width="32.9085" height="46.3896" transform="rotate(-14.3754 31.7497 43.298)" fill="#00BC7A"/>
            <path d="M38.1389 26.3576C40.1507 25.5992 42.4146 26.6231 43.1735 28.6348L46.4347 37.2825L61.4866 33.3407L61.4903 33.3393C62.2981 33.1343 63.1356 33.1852 63.8969 33.4828L63.9245 33.4233L64.4609 33.7386C65.3552 34.2646 65.993 35.1107 66.2619 36.1175L66.2629 36.1202L77.2812 78.2447L77.2826 78.2484C77.539 79.2588 77.3958 80.3159 76.869 81.2119L76.8678 81.2113C76.4119 81.9943 75.7137 82.5796 74.8851 82.8921C74.7415 82.9462 74.6053 82.9816 74.4942 83.0123L74.4878 83.0148L45.3312 90.6454L45.3285 90.6465C43.2487 91.1804 41.1082 89.9305 40.5612 87.8521L40.5608 87.8511L38.768 81.0022L28.0562 85.0419C26.0443 85.8004 23.7803 84.7765 23.0216 82.7647L7.65895 42.0281C6.90045 40.0163 7.92444 37.7523 9.93612 36.9935L38.1389 26.3576ZM33.1682 44.2039C33.0411 44.2358 32.9226 44.3203 32.8414 44.4555C32.7676 44.5915 32.7473 44.7345 32.7831 44.8793L32.7844 44.8799L43.8026 87.0043L43.8033 87.0062C43.8791 87.3007 44.1818 87.4814 44.4863 87.403L44.4854 87.4033L73.6239 79.7774L73.6248 79.777C73.7806 79.7316 73.9016 79.6391 73.9752 79.5134C74.0347 79.4116 74.0604 79.3084 74.0552 79.2025L74.0256 79.0852L63.0073 36.9608L63.0053 36.9553C62.9733 36.8281 62.8885 36.711 62.7531 36.6298C62.616 36.5555 62.4726 36.5353 62.3265 36.5725L62.3262 36.5716L33.1731 44.2031L33.1682 44.2039ZM11.1181 40.1276C10.8325 40.2355 10.6855 40.5604 10.7931 40.8461L26.1557 81.5827C26.2635 81.8685 26.5884 82.0153 26.8742 81.9077L37.915 77.744L29.5358 45.7418L29.5353 45.7378C29.2789 44.7275 29.4213 43.6706 29.9479 42.7746C30.4739 41.8801 31.3203 41.2414 32.3273 40.9724L32.3301 40.9714L43.1765 38.1355L40.0393 29.8167C39.9314 29.5312 39.6065 29.3843 39.3208 29.4918L11.1181 40.1276Z" fill="black" stroke="black" strokeWidth="1.11678"/>
          </svg>
          <span>Dispatch Tickets</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-3">
          <BrandSwitcher />
        </div>

        {workspaceId && (
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
                    </Link>
                  </Button>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Organization navigation */}
      <div className="border-t p-3">
        <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">Organization</p>
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

      {/* Account menu at bottom */}
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
