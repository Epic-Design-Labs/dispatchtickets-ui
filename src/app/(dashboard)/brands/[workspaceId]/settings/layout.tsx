'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Settings, Mail } from 'lucide-react';

const settingsNav = [
  {
    title: 'General',
    href: '',
    icon: Settings,
    description: 'Brand name, identity, and preferences',
  },
  {
    title: 'Email',
    href: '/email',
    icon: Mail,
    description: 'Domains and autoresponse settings',
  },
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
    <div className="flex flex-1">
      {/* Settings Sidebar */}
      <aside className="w-64 border-r bg-muted/30 p-4">
        <nav className="space-y-1">
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
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
