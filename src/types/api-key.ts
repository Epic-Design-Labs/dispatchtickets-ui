export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  allBrands: boolean;
  brandIds: string[];
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
