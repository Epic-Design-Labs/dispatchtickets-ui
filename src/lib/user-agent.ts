/**
 * Turn a visitor's user-agent string into the two facts an agent actually
 * wants: which browser, which system.
 *
 * This is a CONVENIENCE, not evidence. The user-agent header is written by
 * the client and anyone can put anything in it, so a parsed result is a
 * readable guess at what the visitor is using -- never a claim about who
 * they are. Callers keep the raw string reachable (a title attribute, a
 * disclosure) so nothing the visitor sent is thrown away, and nothing here
 * is ever used to make a decision.
 *
 * Deliberately hand-rolled and small rather than a UA-parsing dependency:
 * we need two labels in a side panel, the full library is a large table of
 * regexes that needs updating forever, and a wrong label here is cosmetic.
 */

export interface ParsedUserAgent {
  /** e.g. "Chrome 131", or null when the string says nothing we recognise. */
  browser: string | null;
  /** e.g. "macOS", "Android 14". */
  system: string | null;
}

/**
 * Order matters and is the whole trick. Every Chromium browser also says
 * "Chrome", and Chrome itself still says "Safari", so the specific tokens
 * have to be tested before the general ones or everything reads as Safari.
 */
const BROWSERS: [name: string, pattern: RegExp][] = [
  ['Edge', /\bEdg(?:[A-Z]{1,3})?\/(\d+)/],
  ['Opera', /\bOPR\/(\d+)/],
  ['Samsung Internet', /\bSamsungBrowser\/(\d+)/],
  ['Firefox', /\b(?:Firefox|FxiOS)\/(\d+)/],
  ['Chrome', /\b(?:Chrome|CriOS)\/(\d+)/],
  ['Safari', /\bVersion\/(\d+)[.\d]* Safari\//],
];

/**
 * Only Android reports a version we can trust. Apple and Microsoft both
 * FROZE theirs years ago to stop sites fingerprinting and gating on them:
 * every current macOS still says "10_15_7", and every Windows since 10
 * says "NT 10.0". Printing those would be worse than printing nothing,
 * because they look like real numbers. So the system is named, not versioned.
 */
function systemOf(ua: string): string | null {
  if (/\bCrOS\b/.test(ua)) return 'ChromeOS';
  const android = /\bAndroid (\d+)/.exec(ua);
  if (android) return `Android ${android[1]}`;
  if (/\biPhone\b/.test(ua)) return 'iOS';
  if (/\biPad\b/.test(ua)) return 'iPadOS';
  if (/\bMac OS X\b/.test(ua)) return 'macOS';
  if (/\bWindows NT\b/.test(ua)) return 'Windows';
  if (/\bLinux\b/.test(ua)) return 'Linux';
  return null;
}

export function parseUserAgent(ua: string | undefined): ParsedUserAgent {
  if (!ua) return { browser: null, system: null };

  let browser: string | null = null;
  for (const [name, pattern] of BROWSERS) {
    const match = pattern.exec(ua);
    if (match) {
      browser = match[1] ? `${name} ${match[1]}` : name;
      break;
    }
  }

  return { browser, system: systemOf(ua) };
}

/**
 * "en-GB" -> "English (United Kingdom)".
 *
 * Intl.DisplayNames is in every browser we support, but the tag comes from
 * the visitor, so a malformed one throws a RangeError rather than returning
 * undefined. On any failure we show the tag itself, which is still more use
 * to an agent than an empty row.
 */
export function describeLocale(locale: string | undefined): string | null {
  if (!locale) return null;
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'language' });
    return names.of(locale) ?? locale;
  } catch {
    return locale;
  }
}

/**
 * Strip the scheme (and a leading "www.") for display. The full URL stays in
 * the title attribute and is what the copy button puts on the clipboard --
 * this only shortens what is drawn, so a long analytics URL doesn't push the
 * panel sideways.
 */
export function shortenUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
}
