import { apiClient } from './client';

export type DomainType = 'INBOUND' | 'OUTBOUND';
export type OutboundReplyMode = 'SINGLE' | 'MATCH';

export interface DnsRecord {
  type: 'MX' | 'TXT' | 'CNAME';
  name: string;
  value: string;
  priority?: number;
  status: 'pending' | 'verified' | 'failed';
}

export interface BrandDomain {
  id: string;
  brandId: string;
  domain: string;
  type: DomainType;
  verified: boolean;
  verifiedAt: string | null;
  resendDomainId: string | null;
  fromName: string | null;
  fromEmail: string | null;
  replyMode: OutboundReplyMode;
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
  replyMode?: OutboundReplyMode;
}

export interface VerifyResult {
  verified: boolean;
  error?: string;
}

export const domainsApi = {
  /**
   * List all domains for a brand
   */
  list: async (brandId: string): Promise<BrandDomain[]> => {
    const response = await apiClient.get<BrandDomain[]>(
      `/brands/${brandId}/domains`
    );
    return response.data;
  },

  /**
   * Add a new domain to a brand
   */
  add: async (
    brandId: string,
    data: AddDomainData
  ): Promise<BrandDomain> => {
    const response = await apiClient.post<BrandDomain>(
      `/brands/${brandId}/domains`,
      data
    );
    return response.data;
  },

  /**
   * Get a single domain by ID
   */
  get: async (
    brandId: string,
    domainId: string
  ): Promise<BrandDomain> => {
    const response = await apiClient.get<BrandDomain>(
      `/brands/${brandId}/domains/${domainId}`
    );
    return response.data;
  },

  /**
   * Verify a domain's DNS configuration
   */
  verify: async (
    brandId: string,
    domainId: string
  ): Promise<VerifyResult> => {
    const response = await apiClient.post<VerifyResult>(
      `/brands/${brandId}/domains/${domainId}/verify`
    );
    return response.data;
  },

  /**
   * Update domain settings (sender info, primary status)
   */
  update: async (
    brandId: string,
    domainId: string,
    data: UpdateDomainData
  ): Promise<BrandDomain> => {
    const response = await apiClient.patch<BrandDomain>(
      `/brands/${brandId}/domains/${domainId}`,
      data
    );
    return response.data;
  },

  /**
   * Remove a domain from a brand
   */
  remove: async (brandId: string, domainId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/domains/${domainId}`);
  },
};

// Type alias for backward compatibility
export type WorkspaceDomain = BrandDomain;
