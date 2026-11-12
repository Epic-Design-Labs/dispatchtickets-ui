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

/**
 * How far from square an icon may be before the colour tile serves it better.
 *
 * The tile is a square, so a wide image is letterboxed into a sliver of its
 * height: at `sm` (20px) a 6:1 wordmark gets about three pixels and reads as a
 * grey smudge. Set generously at 2.5 -- a logo with some breathing room in its
 * artwork still renders fine, and only something that is plainly a wordmark is
 * turned away.
 */
const MAX_ASPECT = 2.5;

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
 * An uploaded icon normally wins -- a brand that went to the trouble of
 * setting one should see it, not a generated colour. The colour tile is the
 * fallback in three cases: no icon, an icon that fails to LOAD (a dead URL on
 * a brand that set one years ago should degrade to the tile, not leave a hole
 * in the row), and an icon too far from square to survive the squeeze.
 */
export function BrandTile({ name, iconUrl, size = 'sm', className }: BrandTileProps) {
  // We remember WHICH url failed, not merely that one did. A brand can change
  // its icon while this is mounted (settings page, or just a cache refresh),
  // and a plain boolean would outlive the url that earned it -- the new icon
  // would never get a chance to load.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  // Same per-url treatment for an icon rejected on its shape, and for the same
  // reason: the verdict belongs to that image, not to the component.
  const [unsuitableUrl, setUnsuitableUrl] = useState<string | null>(null);
  const usable = !!iconUrl && brokenUrl !== iconUrl && unsuitableUrl !== iconUrl;

  /**
   * Judge the shape once the image reports its intrinsic size. Zero or missing
   * dimensions (some SVGs declare none) are LEFT ALONE -- unknown is not the
   * same as unsuitable, and guessing would drop icons that render perfectly.
   */
  const judgeShape = (img: HTMLImageElement) => {
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return;
    const aspect = Math.max(w / h, h / w);
    if (aspect > MAX_ASPECT) setUnsuitableUrl(iconUrl ?? null);
  };

  const base = cn(
    'grid shrink-0 place-items-center overflow-hidden font-bold text-white select-none',
    SIZES[size],
    className
  );

  if (usable) {
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
        onLoad={(e) => judgeShape(e.currentTarget)}
        // A cached image can finish loading before React attaches onLoad, and
        // the event is then never delivered. The ref catches that case.
        ref={(el) => {
          if (el?.complete) judgeShape(el);
        }}
      />
    );
  }

  return (
    <span className={base} style={{ background: brandColor(name) }} aria-hidden="true">
      {brandInitials(name)}
    </span>
  );
}
