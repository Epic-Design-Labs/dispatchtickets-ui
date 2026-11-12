'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Shared shape for every row and heading in the sidebar.
 *
 * These exist because the sidebar had fifteen-line `<Button asChild><Link>`
 * blocks repeated per item, each carrying its own copy of the active styling.
 * One of them always drifted. Active state is now defined once, here.
 */

export function SidebarSection({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div className={cn('border-b px-3 py-3.5', className)} {...props}>
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
  /** Rendered right-aligned. Hidden entirely when undefined or 0. */
  count?: number;
  title?: string;
  children?: React.ReactNode;
}

export function NavItem({
  href,
  icon,
  label,
  active = false,
  count,
  title,
  children,
}: NavItemProps) {
  const showCount = typeof count === 'number' && count > 0;

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      title={title ?? label}
      className={cn(
        // The accent bar is placed with a negative offset that matches the
        // section's px-3, so it sits flush against the sidebar's own edge.
        'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
        'before:absolute before:top-1.5 before:bottom-1.5 before:-left-3 before:w-[3px] before:rounded-r-[3px] before:content-[""]',
        active
          ? 'bg-brand-soft text-brand-strong font-medium before:bg-brand'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground before:bg-transparent'
      )}
    >
      {icon ? <span className="grid w-5 shrink-0 place-items-center">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {showCount ? (
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
      {children}
    </Link>
  );
}
