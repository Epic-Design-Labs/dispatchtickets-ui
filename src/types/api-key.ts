export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  allBrands: boolean;
  brandIds: string[];
  /** Used by Dispatch itself (e.g. the support portal); the server refuses to revoke it. */
  isSystem?: boolean;
  // Only returned on creation
  key?: string;
}

export interface CreateApiKeyInput {
  name?: string;
  allBrands?: boolean;
  brandIds?: string[];
}

export interface UpdateApiKeyScopeInput {
  allBrands?: boolean;
  brandIds?: string[];
}
