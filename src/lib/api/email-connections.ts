import { apiClient } from './client';

export type EmailConnectionProvider = 'GMAIL' | 'OUTLOOK';
export type EmailConnectionStatus = 'ACTIVE' | 'ERROR' | 'DISCONNECTED';

export interface EmailConnection {
  id: string;
  brandId: string;
  name: string;
  isPrimary: boolean;
  provider: EmailConnectionProvider;
  email: string;
  status: EmailConnectionStatus;
  lastSyncAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface InitiateOAuthResponse {
  authUrl: string;
}

export const emailConnectionsApi = {
  /**
   * Get all email connections for a brand
   */
  list: async (brandId: string): Promise<EmailConnection[]> => {
    const response = await apiClient.get<EmailConnection[]>(
      `/brands/${brandId}/email-connections`
    );
    return response.data;
  },

  /**
   * Get a specific email connection
   */
  get: async (brandId: string, connectionId: string): Promise<EmailConnection | null> => {
    try {
      const response = await apiClient.get<EmailConnection>(
        `/brands/${brandId}/email-connections/${connectionId}`
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Initiate Gmail OAuth flow to add a new connection
   */
  authorizeGmail: async (
    brandId: string,
    connectionName?: string
  ): Promise<InitiateOAuthResponse> => {
    const response = await apiClient.post<InitiateOAuthResponse>(
      `/brands/${brandId}/email-connections/authorize`,
      { provider: 'GMAIL', connectionName }
    );
    return response.data;
  },

  /**
   * Update connection settings (name)
   */
  update: async (
    brandId: string,
    connectionId: string,
    data: { name?: string }
  ): Promise<EmailConnection> => {
    const response = await apiClient.patch<EmailConnection>(
      `/brands/${brandId}/email-connections/${connectionId}`,
      data
    );
    return response.data;
  },

  /**
   * Set connection as primary
   */
  setPrimary: async (brandId: string, connectionId: string): Promise<void> => {
    await apiClient.post(`/brands/${brandId}/email-connections/${connectionId}/primary`);
  },

  /**
   * Disconnect and remove an email connection
   */
  disconnect: async (brandId: string, connectionId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/email-connections/${connectionId}`);
  },

  /**
   * Trigger manual sync for all connections
   */
  syncAll: async (brandId: string, full?: boolean): Promise<{ ticketsCreated: number }> => {
    const response = await apiClient.post<{ ticketsCreated: number }>(
      `/brands/${brandId}/email-connections/sync${full ? '?full=true' : ''}`
    );
    return response.data;
  },

  /**
   * Trigger manual sync for a specific connection
   */
  sync: async (
    brandId: string,
    connectionId: string,
    full?: boolean
  ): Promise<{ ticketsCreated: number }> => {
    const response = await apiClient.post<{ ticketsCreated: number }>(
      `/brands/${brandId}/email-connections/${connectionId}/sync${full ? '?full=true' : ''}`
    );
    return response.data;
  },

  /**
   * Retry a failed connection - resets error status and syncs
   */
  retry: async (
    brandId: string,
    connectionId: string
  ): Promise<{ success: boolean; ticketsCreated: number; error?: string }> => {
    const response = await apiClient.post<{ success: boolean; ticketsCreated: number; error?: string }>(
      `/brands/${brandId}/email-connections/${connectionId}/retry`
    );
    return response.data;
  },

  /**
   * Initiate OAuth reconnection for a disconnected connection
   * Returns OAuth URL to redirect user to Google
   */
  reconnect: async (
    brandId: string,
    connectionId: string
  ): Promise<InitiateOAuthResponse> => {
    const response = await apiClient.post<InitiateOAuthResponse>(
      `/brands/${brandId}/email-connections/${connectionId}/reconnect`
    );
    return response.data;
  },
};
