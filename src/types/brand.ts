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
  // Brand identity
  url?: string;
  iconUrl?: string;
  // Outbound email settings
  fromName?: string;
  fromEmail?: string;
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
  // Brand identity
  url?: string;
  iconUrl?: string;
  // Outbound email settings
  fromName?: string;
  fromEmail?: string;
}

