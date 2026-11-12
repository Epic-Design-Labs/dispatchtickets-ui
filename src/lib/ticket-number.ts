/**
 * The ticket number a human reads: "EDL-1271".
 *
 * Every brand has a `ticketPrefix`, the settings page advertises the format as
 * `{PREFIX}-{number}`, and the CSAT email template uses it -- but no ticket
 * screen rendered it. The table showed a bare `#1271`, which is ambiguous
 * across brands, and the detail page showed the first twelve characters of the
 * internal nanoid, which is not a ticket number at all and means nothing to
 * the person reading it.
 *
 * A brand with no prefix set falls back to `#1271`, which is what the sequence
 * alone can honestly say.
 */
export function formatTicketNumber(
  prefix: string | null | undefined,
  ticketNumber: number | null | undefined
): string {
  if (ticketNumber == null) return '';
  const clean = (prefix ?? '').trim().toUpperCase();
  return clean ? `${clean}-${ticketNumber}` : `#${ticketNumber}`;
}
