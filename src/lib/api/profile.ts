import { apiClient } from './client';

export interface Profile {
  displayName: string | null;
  avatarUrl: string | null;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
}

export const profileApi = {
  get: async (): Promise<Profile> => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  update: async (data: UpdateProfileInput): Promise<Profile> => {
    const response = await apiClient.patch('/auth/profile', data);
    return response.data;
  },
};
