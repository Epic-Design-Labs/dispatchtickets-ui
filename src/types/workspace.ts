export interface Workspace {
  id: string;
  accountId: string;
  slug: string;
  name: string;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ticketSchema?: unknown;
  customInboundDomain?: string;
  inboundEmailEnabled?: boolean;
  ticketPrefix: string;      // Prefix for public ticket IDs (e.g., "EDL")
  nextTicketNumber: number;  // Next ticket number to assign
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  settings?: Record<string, unknown>;
  ticketPrefix?: string;      // Optional override for ticket prefix
  ticketNumberStart?: number; // Optional starting number (default: 1000)
}

export interface UpdateWorkspaceInput {
  name?: string;
  settings?: Record<string, unknown>;
}
