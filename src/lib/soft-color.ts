/**
 * Soft-filled chips from an arbitrary brand colour.
 *
 * Brands pick their own status colours, so the status pill cannot be a fixed
 * palette -- it has to derive a background and a text colour from whatever hex
 * the customer saved. The naive version (pale background, the raw colour as
 * text) is what shipped before and it fails readably: #f59e0b amber on its own
 * 88%-white tint lands around 1.8:1, well under the 4.5:1 WCAG asks for body
 * text. Yellows and light greens are the worst offenders, and they are exactly
 * the colours people choose for "pending" and "resolved".
 *
 * So the text colour is DARKENED until it passes against the background it
 * will actually sit on, rather than assumed to pass. The hue is preserved --
 * only the lightness moves -- so a brand's colour still reads as theirs.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** How far the fill is mixed toward white. Matches the design's *-soft tokens. */
const FILL_MIX = 0.88;

/** WCAG AA for normal-size text. A chip is small, so this is the floor, not a target. */
const MIN_CONTRAST = 4.5;

/** Each darkening pass. Small enough not to overshoot into near-black. */
const DARKEN_STEP = 0.86;

/** Enough passes to take any colour to black; the loop exits as soon as it passes. */
const MAX_PASSES = 14;

/** The app's --foreground. Kept in sync by hand; it is a constant in globals.css. */
const INK = '#1b1b25';

function parseHex(input: string): Rgb | null {
  const hex = input.replace('#', '').trim();
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  const part = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function mixWithWhite({ r, g, b }: Rgb, amount: number): Rgb {
  return {
    r: r + (255 - r) * amount,
    g: g + (255 - g) * amount,
    b: b + (255 - b) * amount,
  };
}

/** WCAG relative luminance, gamma-corrected -- not the naive 0.299/0.587/0.114 average. */
function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

export interface SoftFill {
  /** The chip's background: the colour mixed most of the way to white. */
  background: string;
  /** The same hue, darkened as far as it takes to be legible on that background. */
  color: string;
}

/**
 * Build a legible soft-filled chip from a brand's colour.
 *
 * Returns null for anything that is not a parseable hex, so callers can fall
 * back rather than render an invalid style attribute.
 */
export function softFill(hexColor: string): SoftFill | null {
  const base = parseHex(hexColor);
  if (!base) return null;

  const background = mixWithWhite(base, FILL_MIX);

  let text = base;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    if (contrastRatio(text, background) >= MIN_CONTRAST) break;
    text = { r: text.r * DARKEN_STEP, g: text.g * DARKEN_STEP, b: text.b * DARKEN_STEP };
  }

  return { background: toHex(background), color: toHex(text) };
}

/**
 * Black or white, whichever is actually readable on a solid fill.
 *
 * A solid status button painted with a brand's own colour had white text
 * hard-coded. On the amber everyone uses for "pending" that is about 2.1:1 --
 * worse than the soft chips were, because there is no pale background to help.
 * Light custom colours (a yellow, a mint) were effectively unreadable.
 *
 * This returns whichever of the two gives more contrast rather than assuming
 * either. It is not a guarantee of AA -- a mid-tone fill can fail against both
 * -- but it is always the better of the two, and for every colour in the
 * default palette it clears 4.5:1.
 */
export function readableTextOn(hexColor: string): string {
  const base = parseHex(hexColor);
  if (!base) return INK;
  const white = { r: 255, g: 255, b: 255 };
  const ink = parseHex(INK)!;
  return contrastRatio(base, white) >= contrastRatio(base, ink) ? '#ffffff' : INK;
}
