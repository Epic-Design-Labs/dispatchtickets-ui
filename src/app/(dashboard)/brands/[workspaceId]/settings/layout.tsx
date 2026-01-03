'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const settingsNav = [
  { title: 'General', href: '' },
  { title: 'Email', href: '/email' },
  { title: 'Integrations', href: '/integrations' },
  { title: 'Webhooks', href: '/webhooks' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const workspaceId = params.workspaceId as string;
  const basePath = `/brands/${workspaceId}/settings`;

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header with inline tabs */}
      <div className="mb-6 flex items-baseline gap-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <nav className="flex gap-4">
          {settingsNav.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive = item.href === ''
              ? pathname === basePath
              : pathname.startsWith(href);

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      {children}
    </div>
  );
}
