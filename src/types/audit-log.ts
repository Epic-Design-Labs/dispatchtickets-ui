export interface PerformedBy {
  email?: string;
  name?: string;
  type: 'user' | 'api' | 'system';
  apiKeyPrefix?: string;
}

export interface AuditLogChange {
  old: unknown;
  new: unknown;
}

export interface AuditLog {
  id: string;
  brandId: string;
  event: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, AuditLogChange>;
  performedBy?: PerformedBy;
  source: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

// Standard event types for display
export const AuditEventLabels: Record<string, string> = {
  'ticket.created': 'Ticket Created',
  'ticket.updated': 'Ticket Updated',
  'ticket.deleted': 'Ticket Deleted',
  'ticket.merged': 'Ticket Merged',
  'ticket.restored': 'Ticket Restored',
  'ticket.spam_marked': 'Marked as Spam',
  'ticket.spam_unmarked': 'Unmarked as Spam',
  'comment.created': 'Comment Added',
  'comment.updated': 'Comment Updated',
  'comment.deleted': 'Comment Deleted',
  'customer.created': 'Customer Created',
  'customer.updated': 'Customer Updated',
  'customer.deleted': 'Customer Deleted',
  'attachment.uploaded': 'Attachment Uploaded',
  'attachment.deleted': 'Attachment Deleted',
  'category.created': 'Category Created',
  'category.updated': 'Category Updated',
  'category.deleted': 'Category Deleted',
  'tag.created': 'Tag Created',
  'tag.deleted': 'Tag Deleted',
  'tag.added_to_ticket': 'Tag Added',
  'tag.removed_from_ticket': 'Tag Removed',
  'email_connection.created': 'Email Connected',
  'email_connection.deleted': 'Email Disconnected',
  'email_connection.error': 'Email Connection Error',
  'email_connection.restored': 'Email Connection Restored',
};

// Entity type labels
export const EntityTypeLabels: Record<string, string> = {
  ticket: 'Ticket',
  comment: 'Comment',
  customer: 'Customer',
  attachment: 'Attachment',
  category: 'Category',
  tag: 'Tag',
  email_connection: 'Email Connection',
};

// Source labels
export const SourceLabels: Record<string, string> = {
  portal: 'Admin Portal',
  api: 'API',
  email: 'Email',
  slack: 'Slack',
  automation: 'Automation',
  system: 'System',
};
