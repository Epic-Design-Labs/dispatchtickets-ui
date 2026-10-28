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
  /** Set once the chat was turned into a ticket and the typed address was asked to confirm. */
  emailConfirmation: {
    email: string;
    sentAt: string;
    confirmedAt: string | null;
    expired: boolean;
    canResend: boolean;
  } | null;
}

export interface ConvertChatInput {
  title: string;
  description: string;
  internalNote?: string;
  /** An address the agent vouches for. Used as-is. */
  email?: string;
  notifyCustomer?: boolean;
}

/** What happened to the customer: see chat-conversion.service.ts in the API. */
export type ConversionDelivery = 'emailed' | 'confirmation_sent' | 'no_email' | 'not_requested';

export interface ConvertChatResult {
  ticketId: string;
  delivery: ConversionDelivery;
  email: string | null;
}

export const chatApi = {
  visitor: async (brandId: string, ticketId: string): Promise<ChatVisitor> => {
    const response = await apiClient.get<ChatVisitor>(`/brands/${brandId}/tickets/${ticketId}/chat`);
    return response.data;
  },

  convert: async (brandId: string, ticketId: string, data: ConvertChatInput): Promise<ConvertChatResult> => {
    const response = await apiClient.post<ConvertChatResult>(
      `/brands/${brandId}/tickets/${ticketId}/chat/convert`,
      data,
    );
    return response.data;
  },

  resendConfirmation: async (brandId: string, ticketId: string): Promise<{ email: string }> => {
    const response = await apiClient.post<{ email: string }>(
      `/brands/${brandId}/tickets/${ticketId}/chat/email-confirmation/resend`,
    );
    return response.data;
  },
};
