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
    brandId: string,
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
      `/brands/${brandId}/customers`,
      { params: searchParams }
    );
    return response.data;
  },

  get: async (brandId: string, customerId: string): Promise<Customer> => {
    const response = await apiClient.get<Customer>(
      `/brands/${brandId}/customers/${customerId}`
    );
    return response.data;
  },

  create: async (brandId: string, data: CreateCustomerInput): Promise<Customer> => {
    const response = await apiClient.post<Customer>(
      `/brands/${brandId}/customers`,
      data
    );
    return response.data;
  },

  update: async (
    brandId: string,
    customerId: string,
    data: UpdateCustomerInput
  ): Promise<Customer> => {
    const response = await apiClient.patch<Customer>(
      `/brands/${brandId}/customers/${customerId}`,
      data
    );
    return response.data;
  },

  delete: async (brandId: string, customerId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/customers/${customerId}`);
  },

  search: async (brandId: string, query: string): Promise<CustomerSearchResult[]> => {
    const response = await apiClient.get<CustomerSearchResult[]>(
      `/brands/${brandId}/customers/search`,
      { params: { q: query } }
    );
    return response.data;
  },
};
