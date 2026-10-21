import { apiClient } from './client';

/** A chat ticket's visitor, as the agent console sees them. */
export interface ChatVisitor {
  /** Seen in the last minute: a reply arrives live. Otherwise it waits. */
  present: boolean;
  lastSeenAt: string;
  startedAt: string;
  /** Visitor-supplied (page URL, referrer, locale, title) plus user agent. Untrusted text. */
  visitor: Record<string, string>;
  /** Typed by the visitor. Never verified, never used to send. */
  claimedEmail: string | null;
  /** Vouched for by the brand's own server (identity token). Who this really is. */
  verified: { userId: string; email: string | null; name: string | null } | null;
  /** Marked as spam. Their messages are still kept here, but nobody is alerted. */
  blocked: boolean;
}

export const chatApi = {
  visitor: async (brandId: string, ticketId: string): Promise<ChatVisitor> => {
    const response = await apiClient.get<ChatVisitor>(`/brands/${brandId}/tickets/${ticketId}/chat`);
    return response.data;
  },
};
