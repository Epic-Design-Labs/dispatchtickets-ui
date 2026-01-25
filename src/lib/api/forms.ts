import { apiClient } from './client';

export interface FormToken {
  id: string;
  brandId: string;
  name: string;
  token: string;
  successUrl: string | null;
  errorUrl: string | null;
  thankYouMessage: string | null;
  fieldMapping: Record<string, string> | null;
  enabled: boolean;
  honeypotField: string | null;
  allowedOrigins: string[];
  submissionCount: number;
  lastSubmissionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormTokenDto {
  name: string;
  successUrl?: string;
  errorUrl?: string;
  thankYouMessage?: string;
  fieldMapping?: Record<string, string>;
  honeypotField?: string;
  allowedOrigins?: string[];
}

export interface UpdateFormTokenDto {
  name?: string;
  successUrl?: string;
  errorUrl?: string;
  thankYouMessage?: string;
  fieldMapping?: Record<string, string>;
  honeypotField?: string;
  allowedOrigins?: string[];
  enabled?: boolean;
}

export const formsApi = {
  list: async (brandId: string): Promise<FormToken[]> => {
    const response = await apiClient.get<FormToken[]>(
      `/brands/${brandId}/forms`
    );
    return response.data;
  },

  get: async (brandId: string, formId: string): Promise<FormToken> => {
    const response = await apiClient.get<FormToken>(
      `/brands/${brandId}/forms/${formId}`
    );
    return response.data;
  },

  create: async (
    brandId: string,
    data: CreateFormTokenDto
  ): Promise<FormToken> => {
    const response = await apiClient.post<FormToken>(
      `/brands/${brandId}/forms`,
      data
    );
    return response.data;
  },

  update: async (
    brandId: string,
    formId: string,
    data: UpdateFormTokenDto
  ): Promise<FormToken> => {
    const response = await apiClient.patch<FormToken>(
      `/brands/${brandId}/forms/${formId}`,
      data
    );
    return response.data;
  },

  delete: async (brandId: string, formId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/forms/${formId}`);
  },

  regenerateToken: async (
    brandId: string,
    formId: string
  ): Promise<FormToken> => {
    const response = await apiClient.post<FormToken>(
      `/brands/${brandId}/forms/${formId}/regenerate`
    );
    return response.data;
  },
};
