export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed' | null;
export type TicketPriority = 'low' | 'normal' | 'medium' | 'high' | 'urgent' | null;
export type TicketSource = 'api' | 'email' | 'slack' | 'sms' | 'web' | 'other';

import { Customer } from './customer';

export interface Ticket {
  id: string;
  workspaceId: string;
  ticketNumber: number;  // Sequential number for public ID (e.g., 1001)
  title: string;
  body?: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  sourceId?: string;
  sourceData?: Record<string, unknown>;
  assigneeId?: string;
  customerId?: string;
  customer?: Customer;
  links?: string[];
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  commentCount?: number;
  attachmentCount?: number;
  isSpam?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketInput {
  title: string;
  body?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  source?: TicketSource;
  assigneeId?: string;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateTicketInput {
  title?: string;
  body?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string;
  customFields?: Record<string, unknown>;
  isSpam?: boolean;
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  assigneeId?: string;
  source?: TicketSource;
  search?: string;
  cursor?: string;
  limit?: number;
  isSpam?: boolean;
}

// Dashboard types for cross-workspace tickets
export interface DashboardTicketFilters extends TicketFilters {
  workspaceIds?: string[];
  customerId?: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  ticketPrefix: string;
  iconUrl?: string;
}

export interface DashboardTicket extends Ticket {
  workspace: WorkspaceInfo;
}

export interface WorkspaceStats {
  name: string;
  prefix: string;
  total: number;
  open: number;
  pending: number;
}

export interface DashboardStats {
  total: number;
  open: number;
  pending: number;
  resolved: number;
  closed: number;
  byWorkspace: Record<string, WorkspaceStats>;
}
