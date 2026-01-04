import { apiClient } from './client';
import {
  Company,
  CreateCompanyInput,
  UpdateCompanyInput,
  PaginatedResponse,
} from '@/types';

export const companiesApi = {
  list: async (
    brandId: string,
    params?: { search?: string; limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<Company>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const response = await apiClient.get<PaginatedResponse<Company>>(
      `/brands/${brandId}/companies`,
      { params: searchParams }
    );
    return response.data;
  },

  get: async (brandId: string, companyId: string): Promise<Company> => {
    const response = await apiClient.get<Company>(
      `/brands/${brandId}/companies/${companyId}`
    );
    return response.data;
  },

  create: async (brandId: string, data: CreateCompanyInput): Promise<Company> => {
    const response = await apiClient.post<Company>(
      `/brands/${brandId}/companies`,
      data
    );
    return response.data;
  },

  update: async (
    brandId: string,
    companyId: string,
    data: UpdateCompanyInput
  ): Promise<Company> => {
    const response = await apiClient.patch<Company>(
      `/brands/${brandId}/companies/${companyId}`,
      data
    );
    return response.data;
  },

  delete: async (brandId: string, companyId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/companies/${companyId}`);
  },
};
