import { apiClient } from './client';
import {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from '@/types';

export const workspacesApi = {
  list: async (): Promise<Workspace[]> => {
    const response = await apiClient.get<Workspace[]>('/workspaces');
    return response.data;
  },

  get: async (id: string): Promise<Workspace> => {
    const response = await apiClient.get<Workspace>(`/workspaces/${id}`);
    return response.data;
  },

  create: async (data: CreateWorkspaceInput): Promise<Workspace> => {
    const response = await apiClient.post<Workspace>('/workspaces', data);
    return response.data;
  },

  update: async (id: string, data: UpdateWorkspaceInput): Promise<Workspace> => {
    const response = await apiClient.patch<Workspace>(`/workspaces/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${id}`);
  },
};
