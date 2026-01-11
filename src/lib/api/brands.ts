import { apiClient } from './client';
import {
  Brand,
  CreateBrandInput,
  UpdateBrandInput,
} from '@/types';

export const brandsApi = {
  list: async (): Promise<Brand[]> => {
    const response = await apiClient.get<Brand[]>('/brands');
    return response.data;
  },

  get: async (id: string): Promise<Brand> => {
    const response = await apiClient.get<Brand>(`/brands/${id}`);
    return response.data;
  },

  create: async (data: CreateBrandInput): Promise<Brand> => {
    const response = await apiClient.post<Brand>('/brands', data);
    return response.data;
  },

  update: async (id: string, data: UpdateBrandInput): Promise<Brand> => {
    const response = await apiClient.patch<Brand>(`/brands/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/brands/${id}?confirm=true`);
  },
};

// Alias for backward compatibility
export const workspacesApi = brandsApi;
