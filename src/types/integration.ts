export interface IntegrationAppSummary {
  id: string;
  name: string;
  homepageUrl: string | null;
  logoUrl: string | null;
}

/** GET /integrations/authorize: what the consent screen shows. */
export interface AuthorizePreview {
  app: IntegrationAppSummary;
  account: { id: string; name: string } | null;
  brands: Array<{ id: string; name: string }>;
  /** Brands an earlier, still-connected approval allowed */
  currentBrandIds: string[];
}

export interface ApproveIntegrationInput {
  client_id: string;
  redirect_uri: string;
  brandIds: string[];
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export interface Installation {
  id: string;
  app: IntegrationAppSummary;
  brandIds: string[];
  connectedAt: string;
  lastUsedAt: string | null;
}
