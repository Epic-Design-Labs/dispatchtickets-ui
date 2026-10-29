import { apiClient } from './client';
import {
  Brand,
  CreateBrandInput,
  UpdateBrandInput,
} from '@/types';
import type { EmailStyle } from '@/types/brand';

export interface EmailPreviewInput {
  style?: EmailStyle;
  logoUrl?: string | null;
  accentColor?: string | null;
  signature?: string | null;
  footer?: string | null;
  showTicketNumber?: boolean;
  showHistory?: boolean;
}

export interface EmailPreview {
  from: string;
  subject: string;
  html: string;
}

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

  /** A sample reply rendered with these (unsaved) email settings. Nothing is sent. */
  emailPreview: async (id: string, data: EmailPreviewInput): Promise<EmailPreview> => {
    const response = await apiClient.post<EmailPreview>(`/brands/${id}/email-preview`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/brands/${id}?confirm=true`);
  },
};

// Alias for backward compatibility
export const workspacesApi = brandsApi;
