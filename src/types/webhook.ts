export type WebhookEvent =
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.deleted'
  | 'comment.created'
  | 'comment.updated'
  | 'comment.deleted';

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
