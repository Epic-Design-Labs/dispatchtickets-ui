export type EmailProvider = 'GMAIL' | 'OUTLOOK';

export type EmailConnectionStatus = 'ACTIVE' | 'ERROR' | 'DISCONNECTED';

export interface EmailConnection {
  id: string;
  brandId: string;
  name: string;
  isPrimary: boolean;
  provider: EmailProvider;
  email: string;
  status: EmailConnectionStatus;
  lastSyncAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface InitiateOAuthInput {
  provider: EmailProvider;
  redirectUrl?: string;
  connectionName?: string;
}

export interface UpdateConnectionInput {
  name?: string;
}
