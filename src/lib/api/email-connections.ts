import { apiClient } from './client';

export type EmailConnectionProvider = 'GMAIL' | 'OUTLOOK';
export type EmailConnectionStatus = 'ACTIVE' | 'ERROR' | 'DISCONNECTED';

export interface EmailConnection {
  id: string;
  brandId: string;
  provider: EmailConnectionProvider;
  email: string;
  status: EmailConnectionStatus;
  lastSyncAt: string | null;
  errorMessage: string | null;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateOAuthResponse {
  authUrl: string;
}

export const emailConnectionsApi = {
  /**
   * Get the email connection for a brand (if any)
   */
  get: async (brandId: string): Promise<EmailConnection | null> => {
    try {
      const response = await apiClient.get<EmailConnection>(
        `/brands/${brandId}/email-connection`
      );
      return response.data;
    } catch (error: any) {
      // 404 means no connection exists
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Initiate Gmail OAuth flow
   */
  authorizeGmail: async (brandId: string): Promise<InitiateOAuthResponse> => {
    const response = await apiClient.post<InitiateOAuthResponse>(
      `/brands/${brandId}/email-connection/authorize`,
      { provider: 'GMAIL' }
    );
    return response.data;
  },

  /**
   * Disconnect email connection
   */
  disconnect: async (brandId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/email-connection`);
  },

  /**
   * Trigger manual sync
   */
  sync: async (brandId: string, full?: boolean): Promise<{ ticketsCreated: number }> => {
    const response = await apiClient.post<{ ticketsCreated: number }>(
      `/brands/${brandId}/email-connection/sync${full ? '?full=true' : ''}`
    );
    return response.data;
  },
};
