export interface Customer {
  id: string;
  brandId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
  notifyEmail?: boolean;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  _count?: {
    tickets: number;
  };
}

export interface Company {
  id: string;
  brandId: string;
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
  notifyEmail?: boolean;
}

export interface UpdateCustomerInput {
  email?: string;
  name?: string;
  avatarUrl?: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
  notifyEmail?: boolean;
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
