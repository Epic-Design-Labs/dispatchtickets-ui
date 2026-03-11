import { apiClient } from './client';
import {
  Contact,
  CreateContactInput,
  UpdateContactInput,
  ContactSearchResult,
  PaginatedResponse,
} from '@/types';

export const contactsApi = {
  list: async (
    brandId: string,
    params?: { search?: string; companyId?: string; limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<Contact>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const response = await apiClient.get<PaginatedResponse<Contact>>(
      `/brands/${brandId}/contacts`,
      { params: searchParams }
    );
    return response.data;
  },

  get: async (brandId: string, contactId: string): Promise<Contact> => {
    const response = await apiClient.get<Contact>(
      `/brands/${brandId}/contacts/${contactId}`
    );
    return response.data;
  },

  create: async (brandId: string, data: CreateContactInput): Promise<Contact> => {
    const response = await apiClient.post<Contact>(
      `/brands/${brandId}/contacts`,
      data
    );
    return response.data;
  },

  update: async (
    brandId: string,
    contactId: string,
    data: UpdateContactInput
  ): Promise<Contact> => {
    const response = await apiClient.patch<Contact>(
      `/brands/${brandId}/contacts/${contactId}`,
      data
    );
    return response.data;
  },

  delete: async (brandId: string, contactId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/contacts/${contactId}`);
  },

  search: async (brandId: string, query: string): Promise<ContactSearchResult[]> => {
    const response = await apiClient.get<ContactSearchResult[]>(
      `/brands/${brandId}/contacts/search`,
      { params: { q: query } }
    );
    return response.data;
  },
};
