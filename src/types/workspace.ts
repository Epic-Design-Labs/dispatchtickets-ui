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
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateWorkspaceInput {
  name?: string;
  settings?: Record<string, unknown>;
}
