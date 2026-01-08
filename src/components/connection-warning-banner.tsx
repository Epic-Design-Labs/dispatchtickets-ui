'use client';

import { useQuery } from '@tanstack/react-query';
import { useBrands } from '@/lib/hooks';
import { emailConnectionsApi } from '@/lib/api/email-connections';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';

export function ConnectionWarningBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data: brands } = useBrands();

  // Check all brands for broken connections
  const { data: brokenConnections } = useQuery({
    queryKey: ['broken-connections', brands?.map(b => b.id)],
    queryFn: async () => {
      if (!brands || brands.length === 0) return [];

      const broken: { brandId: string; brandName: string; email: string; error?: string }[] = [];

      for (const brand of brands) {
        try {
          const connections = await emailConnectionsApi.list(brand.id);
          for (const conn of connections) {
            if (conn.status === 'ERROR' || conn.status === 'DISCONNECTED') {
              broken.push({
                brandId: brand.id,
                brandName: brand.name,
                email: conn.email,
                error: conn.errorMessage,
              });
            }
          }
        } catch {
          // Ignore errors fetching connections
        }
      }

      return broken;
    },
    enabled: !!brands && brands.length > 0,
    refetchInterval: 60000, // Check every minute
    staleTime: 30000,
  });

  if (dismissed || !brokenConnections || brokenConnections.length === 0) {
    return null;
  }

  const firstBroken = brokenConnections[0];
  const moreCount = brokenConnections.length - 1;

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">
            <strong>Email connection failed</strong> for {firstBroken.brandName} ({firstBroken.email})
            {moreCount > 0 && ` and ${moreCount} more`}.
            New emails won&apos;t create tickets until reconnected.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/brands/${firstBroken.brandId}/settings/email`}>
              Fix Now
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
