export interface TicketWatcher {
  id: string;
  ticketId: string;
  memberId: string;
  memberEmail: string;
  memberName?: string | null;
  addedBy?: string | null;
  addedAt: string;
  notifyOnComment: boolean;
  notifyOnStatusChange: boolean;
}

export interface AddWatcherInput {
  memberId: string;
  memberEmail: string;
  memberName?: string;
}

export interface UpdateWatcherPreferencesInput {
  notifyOnComment?: boolean;
  notifyOnStatusChange?: boolean;
}
