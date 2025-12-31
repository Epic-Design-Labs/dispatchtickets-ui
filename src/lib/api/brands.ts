import { apiClient } from './client';
import {
  Brand,
  CreateBrandInput,
  UpdateBrandInput,
} from '@/types';

// API still uses /workspaces endpoint, but UI calls these "brands"
export const brandsApi = {
  list: async (): Promise<Brand[]> => {
    const response = await apiClient.get<Brand[]>('/workspaces');
    return response.data;
  },

  get: async (id: string): Promise<Brand> => {
    const response = await apiClient.get<Brand>(`/workspaces/${id}`);
    return response.data;
  },

  create: async (data: CreateBrandInput): Promise<Brand> => {
    const response = await apiClient.post<Brand>('/workspaces', data);
    return response.data;
  },

  update: async (id: string, data: UpdateBrandInput): Promise<Brand> => {
    const response = await apiClient.patch<Brand>(`/workspaces/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${id}`);
  },
};

// Alias for backward compatibility
export const workspacesApi = brandsApi;
