import { apiClient } from './client';

export interface Profile {
  displayName: string | null;
  avatarUrl: string | null;
  notifyEmail: boolean;
  notifyToast: boolean;
  notifyDesktop: boolean;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
  notifyEmail?: boolean;
  notifyToast?: boolean;
  notifyDesktop?: boolean;
}

export interface AvatarUploadInput {
  filename: string;
  contentType: string;
  size: number;
}

export interface AvatarUploadResponse {
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
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

  initiateAvatarUpload: async (data: AvatarUploadInput): Promise<AvatarUploadResponse> => {
    const response = await apiClient.post('/auth/profile/avatar', data);
    return response.data;
  },

  confirmAvatarUpload: async (): Promise<Profile> => {
    const response = await apiClient.post('/auth/profile/avatar/confirm');
    return response.data;
  },

  deleteAvatar: async (): Promise<Profile> => {
    const response = await apiClient.delete('/auth/profile/avatar');
    return response.data;
  },
};
