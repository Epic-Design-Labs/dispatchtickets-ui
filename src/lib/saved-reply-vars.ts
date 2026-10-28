/**
 * Variables a saved reply can use. Filled in the reply box when the reply is
 * inserted, so the agent sees (and can fix) exactly what will be sent. One
 * with no value is left as written, which is easy to spot before sending.
 */
export const SAVED_REPLY_VARIABLES = [
  { key: 'customerName', label: "Contact's full name" },
  { key: 'customerFirstName', label: "Contact's first name" },
  { key: 'agentName', label: 'Your name' },
  { key: 'agentFirstName', label: 'Your first name' },
  { key: 'ticketNumber', label: 'Ticket number' },
] as const;

export type SavedReplyValues = Partial<Record<(typeof SAVED_REPLY_VARIABLES)[number]['key'], string | undefined>>;

export function fillSavedReply(body: string, values: SavedReplyValues): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = values[key as keyof SavedReplyValues];
    return value ? value : match;
  });
}

export const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || undefined;
