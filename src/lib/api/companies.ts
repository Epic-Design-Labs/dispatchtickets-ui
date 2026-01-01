import { apiClient } from './client';
import {
  Company,
  CreateCompanyInput,
  UpdateCompanyInput,
  PaginatedResponse,
} from '@/types';

export const companiesApi = {
  list: async (
    workspaceId: string,
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
      `/workspaces/${workspaceId}/companies`,
      { params: searchParams }
    );
    return response.data;
  },

  get: async (workspaceId: string, companyId: string): Promise<Company> => {
    const response = await apiClient.get<Company>(
      `/workspaces/${workspaceId}/companies/${companyId}`
    );
    return response.data;
  },

  create: async (workspaceId: string, data: CreateCompanyInput): Promise<Company> => {
    const response = await apiClient.post<Company>(
      `/workspaces/${workspaceId}/companies`,
      data
    );
    return response.data;
  },

  update: async (
    workspaceId: string,
    companyId: string,
    data: UpdateCompanyInput
  ): Promise<Company> => {
    const response = await apiClient.patch<Company>(
      `/workspaces/${workspaceId}/companies/${companyId}`,
      data
    );
    return response.data;
  },

  delete: async (workspaceId: string, companyId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/companies/${companyId}`);
  },
};
