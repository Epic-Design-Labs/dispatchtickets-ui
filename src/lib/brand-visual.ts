/**
 * Deterministic colour + initials for a brand that has no uploaded icon.
 *
 * The palette and the hash are lifted verbatim from the design so a brand
 * lands on the same colour here as it does in the mock. Do not "improve" the
 * hash: the colour is identity, and changing the function reshuffles every
 * brand's colour at once.
 */
const BRAND_PALETTE = [
  '#7c4dff',
  '#2f6bff',
  '#f59e0b',
  '#10b981',
  '#ec4899',
  '#0ea5e9',
  '#f97316',
  '#8b5cf6',
  '#14b8a6',
  '#ef4444',
] as const;

function hash(input: string): number {
  let acc = 7;
  for (const char of input) {
    acc = (acc * 31 + char.charCodeAt(0)) >>> 0;
  }
  return acc;
}

/** Stable background colour for a name. Same name in, same colour out. */
export function brandColor(name: string): string {
  return BRAND_PALETTE[hash(name) % BRAND_PALETTE.length];
}

/**
 * One or two letters for the tile. Splits on whitespace, `@` and `.` so an
 * address ("support@acme.com") reads as SA rather than S, and falls back to
 * the first two letters of a single word.
 */
export function brandInitials(name: string): string {
  const parts = name.replace(/[^\w\s@.]/g, '').split(/[\s@.]+/).filter(Boolean);
  const first = parts[0] ?? '?';
  const second = parts[1]?.[0] ?? first[1] ?? '';
  return (first[0] + second).toUpperCase();
}
