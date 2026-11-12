'use client';

import { createContext, useContext } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Shared shape for every row and heading in the sidebar.
 *
 * These exist because the sidebar had fifteen-line `<Button asChild><Link>`
 * blocks repeated per item, each carrying its own copy of the active styling.
 * One of them always drifted. Active state is defined once, here.
 */

/**
 * The EFFECTIVE collapsed state, which is not the same as the stored
 * preference: the mobile sheet renders the same sidebar and is never a rail,
 * so it provides `false` regardless of what the user picked on desktop.
 */
const CollapsedContext = createContext(false);

export const SidebarCollapsedProvider = CollapsedContext.Provider;

export function useSidebarIsCollapsed(): boolean {
  return useContext(CollapsedContext);
}

export function SidebarSection({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  const collapsed = useSidebarIsCollapsed();
  return (
    <div className={cn('border-b', collapsed ? 'px-2.5 py-2' : 'px-3 py-3.5', className)} {...props}>
      {children}
    </div>
  );
}

export function SidebarSectionHeader({
  children,
  action,
}: {
  children: React.ReactNode;
  /** Optional control pinned to the right of the heading (e.g. "add brand"). */
  action?: React.ReactNode;
}) {
  // On the rail the heading and its action have nowhere to go; the section
  // rules are what separate the groups instead.
  if (useSidebarIsCollapsed()) return null;

  return (
    <div className="flex items-center gap-2 px-2.5 pb-2">
      <h3 className="text-subtle text-[11px] font-semibold tracking-[0.04em] uppercase">
        {children}
      </h3>
      {action ? <div className="ml-auto flex items-center">{action}</div> : null}
    </div>
  );
}

interface NavItemProps {
  href: string;
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  /**
   * Rendered right-aligned, hidden when absent or zero. A string is allowed so
   * a capped query can say "100+" instead of claiming an exact 100.
   */
  count?: number | string;
  /**
   * An urgent count -- people waiting in chat. Unlike `count` this survives
   * the collapse, shrinking to a dot, because it is the one number worth
   * interrupting someone for.
   */
  badgeCount?: number;
  title?: string;
  /** Extra classes on the link itself (the brand rows reserve room for a star). */
  className?: string;
}

export function NavItem({
  href,
  icon,
  label,
  active = false,
  count,
  badgeCount,
  title,
  className,
}: NavItemProps) {
  const collapsed = useSidebarIsCollapsed();
  const showCount = count !== undefined && count !== 0 && count !== '0';
  const showBadge = typeof badgeCount === 'number' && badgeCount > 0;

  const link = (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? undefined : (title ?? label)}
      aria-label={collapsed ? label : undefined}
      className={cn(
        // The accent bar is placed with a negative offset that matches the
        // section's horizontal padding, so it sits flush against the
        // sidebar's own edge in both widths.
        'relative flex items-center rounded-lg text-sm transition-colors',
        'before:absolute before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-[3px] before:content-[""]',
        collapsed
          ? 'justify-center px-0 py-2.5 before:-left-2.5'
          : 'gap-2.5 px-2.5 py-2 before:-left-3',
        active
          ? 'bg-brand-soft text-brand-strong font-medium before:bg-brand'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground before:bg-transparent',
        className
      )}
    >
      {icon ? <span className="grid w-5 shrink-0 place-items-center">{icon}</span> : null}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && showCount ? (
        <span
          className={cn(
            'shrink-0 text-xs',
            active
              ? 'bg-brand-softer text-brand-strong rounded-md px-2 py-px font-semibold'
              : 'text-subtle'
          )}
        >
          {count}
        </span>
      ) : null}
      {showBadge ? (
        collapsed ? (
          <span
            className="bg-danger border-card absolute top-1 right-1.5 h-2.5 w-2.5 rounded-full border-2"
            aria-hidden="true"
          />
        ) : (
          <span className="bg-danger ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-px text-xs font-semibold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
            {badgeCount}
          </span>
        )
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {title ?? label}
        {showCount ? ` · ${count}` : ''}
        {showBadge ? ` · ${badgeCount} waiting` : ''}
      </TooltipContent>
    </Tooltip>
  );
}
