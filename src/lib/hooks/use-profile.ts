'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, Profile, UpdateProfileInput, AvatarUploadInput } from '@/lib/api';

export const profileKeys = {
  profile: ['profile'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.profile,
    queryFn: () => profileApi.get(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileInput) => profileApi.update(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData<Profile>(profileKeys.profile, updatedProfile);
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Get presigned upload URL
      const uploadData: AvatarUploadInput = {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      };
      const { uploadUrl } = await profileApi.initiateAvatarUpload(uploadData);

      // Step 2: Upload file directly to S3/R2
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Step 3: Confirm upload and get updated profile
      return profileApi.confirmAvatarUpload();
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData<Profile>(profileKeys.profile, updatedProfile);
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => profileApi.deleteAvatar(),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData<Profile>(profileKeys.profile, updatedProfile);
    },
  });
}
