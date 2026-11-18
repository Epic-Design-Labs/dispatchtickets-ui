'use client';

import { useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { hasUnsavedChanges } from '@/lib/hooks/use-unsaved-changes';
import { cn } from '@/lib/utils';

/**
 * Settings, as a sidebar rather than fourteen links in a row.
 *
 * The tabs were a single flex row of every page, which at this count wraps
 * into an unreadable block on a laptop and ran off the edge below that -- and
 * read as one undifferentiated list, when half of it is about how customers
 * reach you and half about how tickets behave once they do. Same fourteen
 * pages, nothing dropped, grouped and down the side; it is also the shape the
 * list can keep growing in.
 */
const settingsNav: { group: string; items: { title: string; href: string }[] }[] = [
  {
    group: 'Tickets',
    items: [
      { title: 'General', href: '' },
      { title: 'Fields', href: '/fields' },
      { title: 'Statuses', href: '/statuses' },
      { title: 'Saved replies', href: '/saved-replies' },
      { title: 'Automation', href: '/automation' },
    ],
  },
  {
    group: 'Channels',
    items: [
      { title: 'Email', href: '/email' },
      { title: 'Channels', href: '/channels' },
      { title: 'Portal', href: '/portal' },
    ],
  },
  {
    group: 'Service',
    items: [
      { title: 'SLA', href: '/sla' },
      { title: 'Satisfaction', href: '/satisfaction' },
    ],
  },
  {
    group: 'Connections',
    items: [
      { title: 'Integrations', href: '/integrations' },
      { title: 'Webhooks', href: '/webhooks' },
      { title: 'Enrichment', href: '/enrichment' },
    ],
  },
  {
    group: 'Audit',
    items: [{ title: 'Activity log', href: '/log' }],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const brandId = params.brandId as string;
  const basePath = `/brands/${brandId}/settings`;

  // Where the last click was headed, held while we ask about the draft it
  // would discard. Null means nothing is pending.
  const [leavingTo, setLeavingTo] = useState<string | null>(null);

  const isCurrent = (href: string) =>
    href === '' ? pathname === basePath : pathname.startsWith(`${basePath}${href}`);

  /**
   * Leaving a page mid-edit used to throw the edits away without a word. The
   * check is made here, at the click, rather than by watching for navigation:
   * the App Router has no way to call a route change off, and a guard that
   * cannot stop the navigation can only apologise after it.
   */
  const navigate = (event: React.MouseEvent, href: string) => {
    if (!hasUnsavedChanges()) return;
    event.preventDefault();
    setLeavingTo(href);
  };

  const leave = () => {
    const href = leavingTo;
    setLeavingTo(null);
    if (href) router.push(href);
  };

  const navLink = (item: { title: string; href: string }, vertical: boolean) => {
    const href = `${basePath}${item.href}`;
    const active = isCurrent(item.href);
    return (
      <Link
        key={item.href}
        href={href}
        onClick={(e) => navigate(e, href)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'rounded-lg text-sm transition-colors',
          vertical ? 'block px-2.5 py-1.5' : 'shrink-0 px-3 py-1.5',
          active
            ? 'bg-brand-soft text-brand-strong font-medium'
            : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
        )}
      >
        {item.title}
      </Link>
    );
  };

  return (
    // No overflow here, deliberately. The dashboard's <main> is already the
    // scrolling box; an overflow on this wrapper adds a second scrollport that
    // never scrolls -- and sticky resolves against the NEAREST one, so the nav
    // below scrolled off the top and the save bar sat a screen under the fold.
    // Both looked like position bugs and were this one line.
    <div>
      {/* Left-aligned, not centred. The mock centres its settings column
          because it is the whole window; here the app sidebar is already to
          the left of it, and centring opened a 280px gap between the two that
          read as a mistake on a wide screen. */}
      <div className="flex max-w-[1120px] gap-8 p-6">
        <nav
          className="sticky top-6 hidden w-44 shrink-0 self-start lg:block"
          aria-label="Settings sections"
        >
          {settingsNav.map((section) => (
            <div key={section.group} className="mb-4">
              <p className="text-subtle px-2.5 pb-1 text-xs font-medium tracking-wide uppercase">
                {section.group}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => navLink(item, true))}
              </div>
            </div>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <h1 className="mb-4 text-2xl font-semibold">Settings</h1>

          {/* Below the sidebar's breakpoint the same pages scroll sideways,
              so none of them becomes unreachable on a narrow screen. */}
          <nav
            className="-mx-6 mb-4 flex gap-1 overflow-x-auto px-6 pb-2 lg:hidden"
            aria-label="Settings sections"
          >
            {settingsNav.flatMap((section) => section.items).map((item) => navLink(item, false))}
          </nav>

          {children}
        </div>
      </div>

      <AlertDialog open={leavingTo !== null} onOpenChange={(open) => !open && setLeavingTo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              This page has changes you have not saved yet. Leaving loses them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on this page</AlertDialogCancel>
            <AlertDialogAction onClick={leave}>Discard and leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
