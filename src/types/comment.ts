export interface Comment {
  id: string;
  ticketId: string;
  author?: string;
  authorEmail?: string;
  body: string;
  isInternal?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentInput {
  body: string;
  author?: string;
  authorEmail?: string;
  isInternal?: boolean;
}

export interface UpdateCommentInput {
  body?: string;
  isInternal?: boolean;
}
