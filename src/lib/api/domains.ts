import { apiClient } from './client';

export type DomainType = 'INBOUND' | 'OUTBOUND';

export interface DnsRecord {
  type: 'MX' | 'TXT' | 'CNAME';
  name: string;
  value: string;
  priority?: number;
  status: 'pending' | 'verified' | 'failed';
}

export interface WorkspaceDomain {
  id: string;
  workspaceId: string;
  domain: string;
  type: DomainType;
  verified: boolean;
  verifiedAt: string | null;
  resendDomainId: string | null;
  fromName: string | null;
  fromEmail: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  records: DnsRecord[];
}

export interface AddDomainData {
  domain: string;
  type: DomainType;
}

export interface UpdateDomainData {
  fromEmail?: string;
  fromName?: string;
  isPrimary?: boolean;
}

export interface VerifyResult {
  verified: boolean;
  error?: string;
}

export const domainsApi = {
  /**
   * List all domains for a workspace
   */
  list: async (workspaceId: string): Promise<WorkspaceDomain[]> => {
    const response = await apiClient.get<WorkspaceDomain[]>(
      `/workspaces/${workspaceId}/domains`
    );
    return response.data;
  },

  /**
   * Add a new domain to a workspace
   */
  add: async (
    workspaceId: string,
    data: AddDomainData
  ): Promise<WorkspaceDomain> => {
    const response = await apiClient.post<WorkspaceDomain>(
      `/workspaces/${workspaceId}/domains`,
      data
    );
    return response.data;
  },

  /**
   * Get a single domain by ID
   */
  get: async (
    workspaceId: string,
    domainId: string
  ): Promise<WorkspaceDomain> => {
    const response = await apiClient.get<WorkspaceDomain>(
      `/workspaces/${workspaceId}/domains/${domainId}`
    );
    return response.data;
  },

  /**
   * Verify a domain's DNS configuration
   */
  verify: async (
    workspaceId: string,
    domainId: string
  ): Promise<VerifyResult> => {
    const response = await apiClient.post<VerifyResult>(
      `/workspaces/${workspaceId}/domains/${domainId}/verify`
    );
    return response.data;
  },

  /**
   * Update domain settings (sender info, primary status)
   */
  update: async (
    workspaceId: string,
    domainId: string,
    data: UpdateDomainData
  ): Promise<WorkspaceDomain> => {
    const response = await apiClient.patch<WorkspaceDomain>(
      `/workspaces/${workspaceId}/domains/${domainId}`,
      data
    );
    return response.data;
  },

  /**
   * Remove a domain from a workspace
   */
  remove: async (workspaceId: string, domainId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/domains/${domainId}`);
  },
};
