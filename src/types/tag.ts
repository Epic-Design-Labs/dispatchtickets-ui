export interface Tag {
  id: string;
  brandId: string;
  name: string;
  color: string | null; // hex color
  createdAt: string;
}

export interface TagWithCount extends Tag {
  ticketCount: number;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}
