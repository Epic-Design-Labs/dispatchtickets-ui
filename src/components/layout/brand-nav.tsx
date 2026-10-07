'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useBrand, useSetupStatus } from '@/lib/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Rocket, Settings } from 'lucide-react';

/**
 * Sections of a brand, rendered as tabs across the top of every brand page.
 * `segment` is the first path segment under /brands/:brandId — it doubles as
 * the key BrandList uses to keep you in the same section when you switch brands.
 */
export const BRAND_NAV_TABS = [
  { name: 'Tickets', segment: 'tickets' },
  { name: 'Contacts', segment: 'contacts' },
  { name: 'Companies', segment: 'companies' },
  { name: 'Recurring', segment: 'recurring-tickets' },
  { name: 'Spam', segment: 'spam' },
] as const;

interface BrandNavProps {
  brandId: string;
}

export function BrandNav({ brandId }: BrandNavProps) {
  const pathname = usePathname();
  const { data: brand } = useBrand(brandId);
  const setupStatus = useSetupStatus(brandId);

  const basePath = `/brands/${brandId}`;
  // The brand root redirects to /tickets, so treat it as Tickets being active.
  const activeSegment =
    pathname === basePath
      ? 'tickets'
      : pathname.slice(basePath.length + 1).split('/')[0];

  const settingsHref = `${basePath}/settings`;
  const gettingStartedHref = `${basePath}/getting-started`;
  const isSetupComplete = !setupStatus.isLoading && setupStatus.percentComplete === 100;

  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 md:gap-6 md:px-6">
      {brand ? (
        <span className="max-w-[35%] shrink-0 truncate text-sm font-semibold md:max-w-[220px]">
          {brand.name}
        </span>
      ) : (
        <Skeleton className="h-4 w-28 shrink-0" />
      )}

      <nav className="flex h-full items-stretch gap-1 overflow-x-auto">
        {BRAND_NAV_TABS.map((tab) => {
          const isActive = activeSegment === tab.segment;

          return (
            <Link
              key={tab.segment}
              href={`${basePath}/${tab.segment}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center border-b-2 px-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>

      <TooltipProvider>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {/* Onboarding stays a chip with progress until it's done, then shrinks
              to an icon so it keeps a home without holding tab real estate. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={gettingStartedHref}
                aria-label="Getting Started"
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-md px-2 text-sm transition-colors',
                  activeSegment === 'getting-started'
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Rocket className="h-4 w-4 shrink-0" />
                {!isSetupComplete && !setupStatus.isLoading && (
                  <span className="hidden text-xs font-medium sm:inline">
                    {setupStatus.completedCount}/{setupStatus.requiredCount}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isSetupComplete
                  ? 'Getting Started'
                  : `Getting Started — ${setupStatus.completedCount} of ${setupStatus.requiredCount} steps done`}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={settingsHref}
                aria-label="Brand settings"
                aria-current={activeSegment === 'settings' ? 'page' : undefined}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  activeSegment === 'settings'
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Settings className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Brand settings</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
