import { apiClient } from './client';

export interface Subscription {
  id: string;
  status: string;
  planId: string;
  planName: string;
  planPrice: number;
  planInterval: string;
  planCurrency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionResponse {
  subscription: Subscription | null;
}

export interface UpgradeRequest {
  planId: string;
  successUrl: string;
  cancelUrl?: string;
}

export interface UpgradeResponse {
  url: string;
}

export interface CancelRequest {
  immediate?: boolean;
}

export interface CancelResponse {
  success: boolean;
  message: string;
  endsAt: string;
}

export const billingApi = {
  getSubscription: async (): Promise<SubscriptionResponse> => {
    const response = await apiClient.get<SubscriptionResponse>('/auth/subscription');
    return response.data;
  },

  upgrade: async (data: UpgradeRequest): Promise<UpgradeResponse> => {
    const response = await apiClient.post<UpgradeResponse>('/auth/subscription/upgrade', data);
    return response.data;
  },

  cancel: async (data?: CancelRequest): Promise<CancelResponse> => {
    const response = await apiClient.post<CancelResponse>('/auth/subscription/cancel', data || {});
    return response.data;
  },

  reactivate: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/subscription/reactivate');
    return response.data;
  },
};
