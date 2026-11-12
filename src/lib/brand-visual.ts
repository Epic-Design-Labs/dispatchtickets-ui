/**
 * Deterministic colour + initials for anything named that has no picture of
 * its own: a brand with no uploaded icon, an agent with no avatar, a contact
 * with no gravatar.
 *
 * The palette and the hash are lifted verbatim from the design, which uses one
 * function for every such tile, so a name lands on the same colour here as it
 * does in the mock. Do not "improve" the hash: the colour is identity, and
 * changing the function reshuffles everyone's colour at once.
 *
 * The palette is chosen for distinctness, NOT for legibility under white text
 * -- amber, emerald and teal all fail contrast against it. Pair it with
 * `readableTextOn()` rather than hard-coding a text colour.
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
