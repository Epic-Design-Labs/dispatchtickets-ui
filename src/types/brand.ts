import { CsatType } from './feedback';

export type EmailStyle = 'conversation' | 'ticket';

export interface Brand {
  id: string;
  accountId: string;
  slug: string;
  name: string;
  ticketPrefix: string;
  nextTicketNumber: number;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ticketSchema?: unknown;
  customInboundDomain?: string;
  inboundEmailEnabled?: boolean;
  // Autoresponse settings
  autoresponseEnabled?: boolean;
  autoresponseSubject?: string;
  autoresponseBody?: string;
  // How customer emails look (see api/src/modules/email/email-style.ts)
  emailStyle?: EmailStyle;
  emailLogoUrl?: string | null;
  emailAccentColor?: string | null;
  emailSignature?: string | null;
  emailFooter?: string | null;
  emailShowTicketNumber?: boolean;
  emailShowHistory?: boolean;
  emailTagReceivingAddress?: boolean;
  // Brand identity
  url?: string;
  iconUrl?: string;
  // Outbound email settings
  fromName?: string;
  fromEmail?: string;
  // CSAT settings
  csatEnabled?: boolean;
  csatType?: CsatType;
  csatDelayMinutes?: number;
  csatEmailSubject?: string | null;
  csatEmailBody?: string | null;
  // SLA settings
  slaEnabled?: boolean;
  slaDefaultHours?: number | null;
  slaByPriority?: Record<string, number>;
  slaNotifyOverdue?: boolean;
  slaBusinessHoursOnly?: boolean;
  slaBusinessHours?: { start: string; end: string; days: number[]; timezone: string };
  // Portal settings
  portalOrigins?: string[];
  // Chat widget
  chatEnabled?: boolean;
  chatAllowedOrigins?: string[];
  chatGreeting?: string | null;
  chatOfflineMessage?: string | null;
  /** When the widget offers to continue by email. */
  chatEmailFollowUp?: 'never' | 'unavailable' | 'waiting';
  /** A signed-in visitor who leaves while waiting has the chat turned into an email ticket. */
  chatAutoConvert?: boolean;
  chatHoursEnabled?: boolean;
  chatHours?: { start: string; end: string; days: number[]; timezone: string } | null;
  chatAlertWarningSeconds?: number | null;
  chatAlertCriticalSeconds?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandInput {
  name: string;
  slug?: string;
  ticketPrefix?: string;
  ticketNumberStart?: number;
  settings?: Record<string, unknown>;
}

export interface UpdateBrandInput {
  name?: string;
  ticketPrefix?: string;
  ticketNumberStart?: number;
  settings?: Record<string, unknown>;
  // Autoresponse settings
  autoresponseEnabled?: boolean;
  autoresponseSubject?: string;
  autoresponseBody?: string;
  // How customer emails look (see api/src/modules/email/email-style.ts)
  emailStyle?: EmailStyle;
  emailLogoUrl?: string | null;
  emailAccentColor?: string | null;
  emailSignature?: string | null;
  emailFooter?: string | null;
  emailShowTicketNumber?: boolean;
  emailShowHistory?: boolean;
  emailTagReceivingAddress?: boolean;
  // Brand identity
  url?: string;
  iconUrl?: string;
  // Outbound email settings
  fromName?: string;
  fromEmail?: string;
  // CSAT settings
  csatEnabled?: boolean;
  csatType?: CsatType;
  csatDelayMinutes?: number;
  csatEmailSubject?: string | null;
  csatEmailBody?: string | null;
  // SLA settings
  slaEnabled?: boolean;
  slaDefaultHours?: number | null;
  slaByPriority?: Record<string, number>;
  slaNotifyOverdue?: boolean;
  slaBusinessHoursOnly?: boolean;
  slaBusinessHours?: { start: string; end: string; days: number[]; timezone: string };
  // Portal settings
  portalOrigins?: string[];
  // Chat widget
  chatEnabled?: boolean;
  chatAllowedOrigins?: string[];
  chatGreeting?: string | null;
  chatOfflineMessage?: string | null;
  /** When the widget offers to continue by email. */
  chatEmailFollowUp?: 'never' | 'unavailable' | 'waiting';
  /** A signed-in visitor who leaves while waiting has the chat turned into an email ticket. */
  chatAutoConvert?: boolean;
  chatHoursEnabled?: boolean;
  chatHours?: { start: string; end: string; days: number[]; timezone: string } | null;
  chatAlertWarningSeconds?: number | null;
  chatAlertCriticalSeconds?: number | null;
}

