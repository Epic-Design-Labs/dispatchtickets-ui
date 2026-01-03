import { apiClient } from './client';

export interface FormToken {
  id: string;
  workspaceId: string;
  name: string;
  token: string;
  successUrl: string | null;
  errorUrl: string | null;
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
  fieldMapping?: Record<string, string>;
  honeypotField?: string;
  allowedOrigins?: string[];
}

export interface UpdateFormTokenDto {
  name?: string;
  successUrl?: string;
  errorUrl?: string;
  fieldMapping?: Record<string, string>;
  honeypotField?: string;
  allowedOrigins?: string[];
  enabled?: boolean;
}

export const formsApi = {
  list: async (workspaceId: string): Promise<FormToken[]> => {
    const response = await apiClient.get<FormToken[]>(
      `/workspaces/${workspaceId}/forms`
    );
    return response.data;
  },

  get: async (workspaceId: string, formId: string): Promise<FormToken> => {
    const response = await apiClient.get<FormToken>(
      `/workspaces/${workspaceId}/forms/${formId}`
    );
    return response.data;
  },

  create: async (
    workspaceId: string,
    data: CreateFormTokenDto
  ): Promise<FormToken> => {
    const response = await apiClient.post<FormToken>(
      `/workspaces/${workspaceId}/forms`,
      data
    );
    return response.data;
  },

  update: async (
    workspaceId: string,
    formId: string,
    data: UpdateFormTokenDto
  ): Promise<FormToken> => {
    const response = await apiClient.patch<FormToken>(
      `/workspaces/${workspaceId}/forms/${formId}`,
      data
    );
    return response.data;
  },

  delete: async (workspaceId: string, formId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/forms/${formId}`);
  },

  regenerateToken: async (
    workspaceId: string,
    formId: string
  ): Promise<FormToken> => {
    const response = await apiClient.post<FormToken>(
      `/workspaces/${workspaceId}/forms/${formId}/regenerate`
    );
    return response.data;
  },
};
