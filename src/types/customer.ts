export interface Customer {
  id: string;
  workspaceId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  _count?: {
    tickets: number;
  };
}

export interface Company {
  id: string;
  workspaceId: string;
  name: string;
  domain?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  customers?: Customer[];
  _count?: {
    customers: number;
  };
}

export interface CreateCustomerInput {
  email: string;
  name?: string;
  avatarUrl?: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerInput {
  email?: string;
  name?: string;
  avatarUrl?: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateCompanyInput {
  name: string;
  domain?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCompanyInput {
  name?: string;
  domain?: string;
  metadata?: Record<string, unknown>;
}

export interface CustomerSearchResult {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  company?: {
    id: string;
    name: string;
  };
}
