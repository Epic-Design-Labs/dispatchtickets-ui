export interface TicketStatusObject {
  id: string;
  brandId: string;
  name: string;
  key: string;
  color: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStatusInput {
  name: string;
  key: string;
  color?: string;
  description?: string;
}

export interface UpdateStatusInput {
  name?: string;
  color?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface StatusWithCount extends TicketStatusObject {
  ticketCount: number;
}
