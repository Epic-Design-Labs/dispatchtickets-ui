// CSAT (Customer Satisfaction) types

export type CsatType = 'thumbs' | 'scale5' | 'scale10';

export interface CsatSettings {
  csatEnabled: boolean;
  csatType: CsatType;
  csatDelayMinutes: number;
  csatEmailSubject?: string | null;
  csatEmailBody?: string | null;
}

export interface TicketFeedback {
  id: string;
  brandId: string;
  ticketId: string;
  rating: number | null;
  ratingType: CsatType;
  comment?: string | null;
  resolverEmail?: string | null;
  resolverName?: string | null;
  customerEmail?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  ticket?: {
    title: string;
    ticketNumber: number;
  };
}

export interface TeamMemberMetrics {
  memberId: string;
  memberEmail: string | null;
  memberName: string | null;
  ticketsResolved: number;
  ticketsClosed: number;
  csatCount: number;
  csatPositive: number;
  csatScore: number | null; // Percentage 0-100
}

export interface TeamMetricsResponse {
  members: TeamMemberMetrics[];
}

// Public rating form data (returned when fetching by token)
export interface RatingFormData {
  id: string;
  ratingType: CsatType;
  ticket: {
    title: string;
    ticketNumber: number;
    publicId: string;
  };
  brand: {
    name: string;
  };
}

// Submit feedback request
export interface SubmitFeedbackRequest {
  rating: number;
  comment?: string;
}

// Submit feedback response
export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
  id: string;
}
