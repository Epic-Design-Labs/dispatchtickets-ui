import { apiClient } from './client';

export type FeatureCategory = 'billing' | 'auth' | 'api' | 'dashboard' | 'analytics' | 'other';

export interface FeatureRequestImage {
  url: string;
  name?: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description?: string;
  featureDetails?: string;
  currentBehavior?: string;
  whyItMatters?: string;
  category?: FeatureCategory;
  images?: FeatureRequestImage[];
  status: 'new' | 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined';
  voteCount: number;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureRequestsResponse {
  requests: FeatureRequest[];
}

export interface FeatureActivityResponse {
  voted: FeatureRequest[];
  authored: FeatureRequest[];
}

export interface CreateFeatureRequestInput {
  title: string;
  featureDetails: string;
  currentBehavior?: string;
  whyItMatters?: string;
  category?: FeatureCategory;
  images?: FeatureRequestImage[];
}

export const featureRequestsApi = {
  list: async (params?: {
    status?: string;
    sortBy?: string;
    limit?: number;
  }): Promise<FeatureRequestsResponse> => {
    const response = await apiClient.get<FeatureRequestsResponse>(
      '/auth/feature-requests',
      { params }
    );
    return response.data;
  },

  create: async (data: CreateFeatureRequestInput): Promise<FeatureRequest> => {
    const response = await apiClient.post<FeatureRequest>(
      '/auth/feature-requests',
      data
    );
    return response.data;
  },

  vote: async (requestId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(
      `/auth/feature-requests/${requestId}/vote`
    );
    return response.data;
  },

  unvote: async (requestId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/auth/feature-requests/${requestId}/vote`
    );
    return response.data;
  },

  getActivity: async (): Promise<FeatureActivityResponse> => {
    const response = await apiClient.get<FeatureActivityResponse>(
      '/auth/feature-requests/activity'
    );
    return response.data;
  },
};
