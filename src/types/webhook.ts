export type WebhookEvent =
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.overdue'
  | 'ticket.awaiting_reply'
  | 'ticket.comment.created'
  | 'chat.started'
  | 'chat.message'
  | '*'
  // Alias of ticket.comment.created, kept for existing subscriptions.
  | 'comment.created';

export interface Webhook {
  id: string;
  brand_id: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookInput {
  url: string;
  events: WebhookEvent[];
  secret?: string;
}
