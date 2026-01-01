import { apiClient } from './client';
import {
  TeamMembersResponse,
  InviteMemberInput,
  UpdateMemberInput,
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
};
