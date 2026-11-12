'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { brandColor, brandInitials } from '@/lib/brand-visual';

const SIZES = {
  sm: 'h-5 w-5 rounded-md text-[9px]',
  md: 'h-6 w-6 rounded-[7px] text-[10px]',
  lg: 'h-8 w-8 rounded-[9px] text-xs',
  xl: 'h-10 w-10 rounded-[11px] text-sm',
} as const;

export type BrandTileSize = keyof typeof SIZES;

interface BrandTileProps {
  name: string;
  /** The brand's uploaded icon, when it has one. Wins over the colour tile. */
  iconUrl?: string | null;
  size?: BrandTileSize;
  className?: string;
}

/**
 * The square that stands in for a brand in lists and tables.
 *
 * An uploaded icon always wins -- a brand that went to the trouble of setting
 * one should see it, not a generated colour. The colour tile is the fallback,
 * and it is also the fallback for an icon that fails to LOAD: a dead URL on a
 * brand that set one years ago should degrade to the tile, not leave a hole in
 * the row.
 */
export function BrandTile({ name, iconUrl, size = 'sm', className }: BrandTileProps) {
  // We remember WHICH url failed, not merely that one did. A brand can change
  // its icon while this is mounted (settings page, or just a cache refresh),
  // and a plain boolean would outlive the url that earned it -- the new icon
  // would never get a chance to load.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const broken = !!iconUrl && brokenUrl === iconUrl;

  const base = cn(
    'grid shrink-0 place-items-center overflow-hidden font-bold text-white select-none',
    SIZES[size],
    className
  );

  if (iconUrl && !broken) {
    return (
      /* Brand icons are arbitrary customer-supplied URLs, so next/image would
         need every one of their hosts in remotePatterns. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        aria-hidden="true"
        className={cn(base, 'bg-muted object-contain')}
        onError={() => setBrokenUrl(iconUrl)}
      />
    );
  }

  return (
    <span className={base} style={{ background: brandColor(name) }} aria-hidden="true">
      {brandInitials(name)}
    </span>
  );
}
