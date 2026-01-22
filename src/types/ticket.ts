import { Customer } from './customer';
import { Category } from './category';
import { Tag } from './tag';
import { TicketStatusObject } from './status';

// Legacy status key type (for backwards compatibility)
export type TicketStatusKey = 'open' | 'pending' | 'resolved' | 'closed' | 'spam' | string | null;
// Keep TicketStatus as an alias for backwards compatibility
export type TicketStatus = TicketStatusKey;
export type TicketPriority = 'low' | 'normal' | 'medium' | 'high' | 'urgent' | null;
export type TicketSource = 'api' | 'email' | 'slack' | 'sms' | 'web' | 'other';
export type CloseReason = 'no_response' | 'out_of_scope' | 'customer_left' | 'duplicate';

export const CLOSE_REASONS: { value: CloseReason; label: string }[] = [
  { value: 'no_response', label: 'No Response' },
  { value: 'out_of_scope', label: 'Out of Scope' },
  { value: 'customer_left', label: 'Customer Left' },
  { value: 'duplicate', label: 'Duplicate' },
];

export interface Ticket {
  id: string;
  brandId: string;
  ticketNumber: number;  // Sequential number for public ID (e.g., 1001)
  title: string;
  body?: string;
  status: TicketStatus;  // Status key (e.g., 'open', 'pending')
  statusId?: string | null;  // Reference to TicketStatus
  statusRef?: TicketStatusObject | null;  // Full status object
  closeReason?: CloseReason | null;  // Reason for closing (only when status=closed)
  priority: TicketPriority;
  source: TicketSource;
  sourceId?: string;
  sourceData?: Record<string, unknown>;
  assigneeId?: string;
  customerId?: string;
  customer?: Customer;
  categoryId?: string | null;
  category?: Category | null;
  tags?: Tag[];
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

export interface WatcherInput {
  memberId: string;
  memberEmail: string;
  memberName?: string;
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
  notifyCustomer?: boolean;
  watchers?: WatcherInput[];
  attachmentIds?: string[];
}

export interface UpdateTicketInput {
  title?: string;
  body?: string;
  status?: TicketStatus;
  closeReason?: CloseReason;
  priority?: TicketPriority;
  assigneeId?: string | null;
  categoryId?: string | null;
  tags?: string[];
  customFields?: Record<string, unknown>;
  isSpam?: boolean;
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  assigneeId?: string;
  customerId?: string;
  categoryId?: string;
  tagIds?: string[];
  source?: TicketSource;
  search?: string;
  cursor?: string;
  limit?: number;
  isSpam?: boolean;
}

// Dashboard types for cross-brand tickets
export interface DashboardTicketFilters extends TicketFilters {
  brandIds?: string[];
  customerId?: string;
}

export interface BrandInfo {
  id: string;
  name: string;
  slug: string;
  ticketPrefix: string;
  iconUrl?: string;
}

export interface DashboardTicket extends Ticket {
  brand: BrandInfo;
}

export interface BrandStats {
  name: string;
  prefix: string;
  total: number;
  open: number;
  pending: number;
}

export interface ResponseMetrics {
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  ticketsWithResponse: number;
  ticketsResolved: number;
}

export interface DashboardStats {
  total: number;
  open: number;
  pending: number;
  resolved: number;
  closed: number;
  byBrand: Record<string, BrandStats>;
  responseMetrics?: ResponseMetrics;
}

export interface TrendDataPoint {
  date: string;
  created: number;
  resolved: number;
}

export interface TicketTrends {
  data: TrendDataPoint[];
  period: {
    start: string;
    end: string;
  };
}
