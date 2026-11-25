'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamApi, Organization } from '@/lib/api/team';
import { InviteMemberInput, UpdateMemberInput, UpdateBrandAssignmentsInput, BrandGroupInput } from '@/types';
import { useAuth } from '@/providers';

export const teamKeys = {
  all: ['team'] as const,
  members: (brandId?: string) => brandId
    ? [...teamKeys.all, 'members', brandId] as const
    : [...teamKeys.all, 'members'] as const,
  organization: () => [...teamKeys.all, 'organization'] as const,
  brandAssignments: (memberId: string) => [...teamKeys.all, 'brandAssignments', memberId] as const,
  brandGroups: () => [...teamKeys.all, 'brandGroups'] as const,
};

/**
 * Fetch team members, optionally filtered by brand access.
 * @param options.brandId - If provided, only returns members who have access to this brand
 */
export function useTeamMembers(options?: { brandId?: string }) {
  return useQuery({
    queryKey: teamKeys.members(options?.brandId),
    queryFn: () => teamApi.getMembers(options),
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteMemberInput) => teamApi.inviteMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members() });
    },
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => teamApi.resendInvite(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members() });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateMemberInput }) =>
      teamApi.updateMember(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members() });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => teamApi.removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members() });
    },
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: (newOwnerId: string) => teamApi.transferOwnership(newOwnerId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members() });
      // The caller is now an admin, not the owner: re-read the session so
      // owner-only controls (billing, delete account) go away.
      await refreshSession();
    },
  });
}

export function useOrganization() {
  return useQuery({
    queryKey: teamKeys.organization(),
    queryFn: teamApi.getOrganization,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => teamApi.updateOrganization(name),
    onSuccess: (data) => {
      queryClient.setQueryData<Organization>(teamKeys.organization(), (old) =>
        old ? { ...old, name: data.name } : { id: '', name: data.name }
      );
    },
  });
}

export function useBrandAssignments(memberId: string) {
  return useQuery({
    queryKey: teamKeys.brandAssignments(memberId),
    queryFn: () => teamApi.getBrandAssignments(memberId),
    enabled: !!memberId,
  });
}

export function useUpdateBrandAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateBrandAssignmentsInput }) =>
      teamApi.updateBrandAssignments(memberId, data),
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.brandAssignments(memberId) });
      queryClient.invalidateQueries({ queryKey: teamKeys.members() });
    },
  });
}

export function useBrandGroups(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: teamKeys.brandGroups(),
    queryFn: teamApi.getBrandGroups,
    enabled: options?.enabled ?? true,
  });
}

/** A group change can change anyone's access: refresh every team view. */
function useInvalidateTeam() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: teamKeys.all });
}

export function useCreateBrandGroup() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (data: BrandGroupInput & { name: string }) => teamApi.createBrandGroup(data),
    onSuccess: invalidate,
  });
}

export function useUpdateBrandGroup() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: BrandGroupInput }) =>
      teamApi.updateBrandGroup(groupId, data),
    onSuccess: invalidate,
  });
}

export function useDeleteBrandGroup() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (groupId: string) => teamApi.deleteBrandGroup(groupId),
    onSuccess: invalidate,
  });
}
