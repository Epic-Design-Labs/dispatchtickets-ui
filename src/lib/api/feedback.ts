import axios from 'axios';
import { RatingFormData, SubmitFeedbackRequest, SubmitFeedbackResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';

// Public API client without authentication
const publicClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const feedbackApi = {
  /**
   * Get feedback form data by token (public - no auth required)
   */
  getByToken: async (token: string): Promise<RatingFormData> => {
    const response = await publicClient.get<RatingFormData>(`/feedback/${token}`);
    return response.data;
  },

  /**
   * Submit feedback rating (public - no auth required)
   */
  submit: async (token: string, data: SubmitFeedbackRequest): Promise<SubmitFeedbackResponse> => {
    const response = await publicClient.post<SubmitFeedbackResponse>(`/feedback/${token}`, data);
    return response.data;
  },
};
