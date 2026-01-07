export interface Comment {
  id: string;
  ticketId: string;
  authorId?: string;
  authorType: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  body: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentInput {
  body: string;
  authorId?: string;
  authorName?: string;
  authorType?: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  metadata?: Record<string, unknown>;
  setStatus?: 'open' | 'pending' | 'resolved';
  connectionId?: string;
  cc?: string[];
}

export interface UpdateCommentInput {
  body?: string;
  metadata?: Record<string, unknown>;
}
