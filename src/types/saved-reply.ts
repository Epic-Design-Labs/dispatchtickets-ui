/** Canned text an agent inserts by typing #shortcut in the reply box. */
export interface SavedReply {
  id: string;
  brandId: string;
  shortcut: string;
  title: string;
  body: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedReplyInput {
  shortcut: string;
  title: string;
  body: string;
}
