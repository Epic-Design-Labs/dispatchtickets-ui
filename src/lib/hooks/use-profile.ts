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

      let uploadUrl: string;
      try {
        const response = await profileApi.initiateAvatarUpload(uploadData);
        uploadUrl = response.uploadUrl;
      } catch (err) {
        console.error('Failed to get upload URL:', err);
        throw new Error('Unable to initiate upload. Storage may not be configured.');
      }

      // Step 2: Upload file directly to S3/R2
      try {
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          console.error('Upload failed:', uploadResponse.status, uploadResponse.statusText);
          throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
      } catch (err) {
        // Check if it's a CORS error (network error with no status)
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          console.error('Possible CORS error during upload');
          throw new Error('Upload blocked. Please contact support to configure storage CORS.');
        }
        throw err;
      }

      // Step 3: Confirm upload and get updated profile
      try {
        return await profileApi.confirmAvatarUpload();
      } catch (err) {
        console.error('Failed to confirm upload:', err);
        throw new Error('Upload succeeded but confirmation failed. Please refresh and try again.');
      }
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
