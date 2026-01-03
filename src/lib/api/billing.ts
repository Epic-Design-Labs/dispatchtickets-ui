import { apiClient } from './client';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
  entitlements: Record<string, unknown>;
}

export interface PlansResponse {
  plans: Plan[];
}

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

export interface UsageResponse {
  ticketCount: number;
  brandCount: number;
  billingPeriodStart: string | null;
  planLimit: number | null;
  brandLimit: number | null;
}

export interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amountPaid: number;
  amountDue: number;
  currency: string;
  created: string;
  periodStart: string;
  periodEnd: string;
  invoiceUrl: string | null;
  invoicePdf: string | null;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  hasMore: boolean;
}

export const billingApi = {
  getPlans: async (): Promise<PlansResponse> => {
    const response = await apiClient.get<PlansResponse>('/auth/plans');
    return response.data;
  },

  getSubscription: async (): Promise<SubscriptionResponse> => {
    const response = await apiClient.get<SubscriptionResponse>('/auth/subscription');
    return response.data;
  },

  getUsage: async (): Promise<UsageResponse> => {
    const response = await apiClient.get<UsageResponse>('/auth/usage');
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

  getInvoices: async (limit?: number): Promise<InvoicesResponse> => {
    const response = await apiClient.get<InvoicesResponse>('/auth/invoices', {
      params: limit ? { limit } : undefined,
    });
    return response.data;
  },
};
