import { apiClient } from './client';

export interface DnsRecord {
  type: 'MX' | 'TXT' | 'CNAME';
  name: string;
  value: string;
  priority?: number;
  status: 'pending' | 'verified' | 'failed';
}

export interface DomainConfig {
  inbound: {
    domain: string | null;
    verified: boolean;
    verifiedAt: string | null;
    records: DnsRecord[];
  };
  outbound: {
    domain: string | null;
    verified: boolean;
    verifiedAt: string | null;
    resendDomainId: string | null;
    records: DnsRecord[];
    fromEmail: string | null;
    fromName: string | null;
  };
}

export interface VerifyResult {
  verified: boolean;
  error?: string;
}

export const domainsApi = {
  get: async (workspaceId: string): Promise<DomainConfig> => {
    const response = await apiClient.get<DomainConfig>(
      `/workspaces/${workspaceId}/domains`
    );
    return response.data;
  },

  setInboundDomain: async (
    workspaceId: string,
    domain: string
  ): Promise<DomainConfig> => {
    const response = await apiClient.post<DomainConfig>(
      `/workspaces/${workspaceId}/domains/inbound`,
      { domain }
    );
    return response.data;
  },

  verifyInboundDomain: async (workspaceId: string): Promise<VerifyResult> => {
    const response = await apiClient.post<VerifyResult>(
      `/workspaces/${workspaceId}/domains/inbound/verify`
    );
    return response.data;
  },

  removeInboundDomain: async (workspaceId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/domains/inbound`);
  },

  setOutboundDomain: async (
    workspaceId: string,
    domain: string
  ): Promise<DomainConfig> => {
    const response = await apiClient.post<DomainConfig>(
      `/workspaces/${workspaceId}/domains/outbound`,
      { domain }
    );
    return response.data;
  },

  verifyOutboundDomain: async (workspaceId: string): Promise<VerifyResult> => {
    const response = await apiClient.post<VerifyResult>(
      `/workspaces/${workspaceId}/domains/outbound/verify`
    );
    return response.data;
  },

  updateSender: async (
    workspaceId: string,
    data: { fromEmail?: string; fromName?: string }
  ): Promise<void> => {
    await apiClient.post(`/workspaces/${workspaceId}/domains/outbound/sender`, data);
  },

  removeOutboundDomain: async (workspaceId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/domains/outbound`);
  },
};
