import { apiClient } from './client';
import {
  TeamMembersResponse,
  InviteMemberInput,
  UpdateMemberInput,
  BrandAssignmentResponse,
  UpdateBrandAssignmentsInput,
  BrandGroup,
  BrandGroupInput,
} from '@/types';

export interface Organization {
  id: string;
  name: string;
}

export const teamApi = {
  // Brand groups (owner/admin; the API enforces it)
  getBrandGroups: async (): Promise<BrandGroup[]> => {
    const response = await apiClient.get<BrandGroup[]>('/auth/brand-groups');
    return response.data;
  },

  createBrandGroup: async (data: BrandGroupInput & { name: string }): Promise<BrandGroup> => {
    const response = await apiClient.post<BrandGroup>('/auth/brand-groups', data);
    return response.data;
  },

  updateBrandGroup: async (groupId: string, data: BrandGroupInput): Promise<BrandGroup> => {
    const response = await apiClient.patch<BrandGroup>(`/auth/brand-groups/${groupId}`, data);
    return response.data;
  },

  deleteBrandGroup: async (
    groupId: string
  ): Promise<{ success: boolean; membersAffected: number; membersLeftWithoutBrands: number }> => {
    const response = await apiClient.delete(`/auth/brand-groups/${groupId}`);
    return response.data;
  },

  getMembers: async (options?: { brandId?: string }): Promise<TeamMembersResponse> => {
    const params = options?.brandId ? { brandId: options.brandId } : undefined;
    const response = await apiClient.get<TeamMembersResponse>('/auth/members', { params });
    return response.data;
  },

  inviteMember: async (data: InviteMemberInput): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/auth/members/invite',
      data
    );
    return response.data;
  },

  resendInvite: async (memberId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/auth/members/${memberId}/resend-invite`
    );
    return response.data;
  },

  updateMember: async (
    memberId: string,
    data: UpdateMemberInput
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.patch<{ success: boolean; message: string }>(
      `/auth/members/${memberId}`,
      data
    );
    return response.data;
  },

  removeMember: async (memberId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/auth/members/${memberId}`
    );
    return response.data;
  },

  transferOwnership: async (newOwnerId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/auth/transfer-ownership',
      { newOwnerId }
    );
    return response.data;
  },

  getOrganization: async (): Promise<Organization> => {
    const response = await apiClient.get<Organization>('/auth/organization');
    return response.data;
  },

  updateOrganization: async (name: string): Promise<{ success: boolean; name: string }> => {
    const response = await apiClient.patch<{ success: boolean; name: string }>(
      '/auth/organization',
      { name }
    );
    return response.data;
  },

  getBrandAssignments: async (memberId: string): Promise<BrandAssignmentResponse> => {
    const response = await apiClient.get<BrandAssignmentResponse>(
      `/auth/members/${memberId}/brands`
    );
    return response.data;
  },

  updateBrandAssignments: async (
    memberId: string,
    data: UpdateBrandAssignmentsInput
  ): Promise<BrandAssignmentResponse> => {
    const response = await apiClient.put<BrandAssignmentResponse>(
      `/auth/members/${memberId}/brands`,
      data
    );
    return response.data;
  },
};
