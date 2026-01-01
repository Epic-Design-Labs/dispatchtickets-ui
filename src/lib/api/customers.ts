import { apiClient } from './client';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerSearchResult,
  PaginatedResponse,
} from '@/types';

export const customersApi = {
  list: async (
    workspaceId: string,
    params?: { search?: string; companyId?: string; limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<Customer>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const response = await apiClient.get<PaginatedResponse<Customer>>(
      `/workspaces/${workspaceId}/customers`,
      { params: searchParams }
    );
    return response.data;
  },

  get: async (workspaceId: string, customerId: string): Promise<Customer> => {
    const response = await apiClient.get<Customer>(
      `/workspaces/${workspaceId}/customers/${customerId}`
    );
    return response.data;
  },

  create: async (workspaceId: string, data: CreateCustomerInput): Promise<Customer> => {
    const response = await apiClient.post<Customer>(
      `/workspaces/${workspaceId}/customers`,
      data
    );
    return response.data;
  },

  update: async (
    workspaceId: string,
    customerId: string,
    data: UpdateCustomerInput
  ): Promise<Customer> => {
    const response = await apiClient.patch<Customer>(
      `/workspaces/${workspaceId}/customers/${customerId}`,
      data
    );
    return response.data;
  },

  delete: async (workspaceId: string, customerId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/customers/${customerId}`);
  },

  search: async (workspaceId: string, query: string): Promise<CustomerSearchResult[]> => {
    const response = await apiClient.get<CustomerSearchResult[]>(
      `/workspaces/${workspaceId}/customers/search`,
      { params: { q: query } }
    );
    return response.data;
  },
};
