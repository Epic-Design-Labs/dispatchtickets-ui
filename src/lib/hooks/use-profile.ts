'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, Profile, UpdateProfileInput } from '@/lib/api';

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
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
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
