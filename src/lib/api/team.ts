import { apiClient } from './client';
import {
  TeamMembersResponse,
  InviteMemberInput,
  UpdateMemberInput,
  BrandAssignmentResponse,
  UpdateBrandAssignmentsInput,
} from '@/types';

export interface Organization {
  id: string;
  name: string;
}

export const teamApi = {
  getMembers: async (): Promise<TeamMembersResponse> => {
    const response = await apiClient.get<TeamMembersResponse>('/auth/members');
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
