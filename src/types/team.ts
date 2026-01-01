export type OrgRole = 'owner' | 'admin' | 'member';

export type MemberStatus = 'active' | 'pending';

export interface BrandAssignment {
  allBrands: boolean;
  workspaceIds: string[];
}

export interface AvailableBrand {
  id: string;
  name: string;
}

export interface BrandAssignmentResponse {
  memberId: string;
  allBrands: boolean;
  workspaceIds: string[];
  availableBrands: AvailableBrand[];
}

export interface UpdateBrandAssignmentsInput {
  allBrands: boolean;
  workspaceIds?: string[];
}

export interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: OrgRole;
  status: MemberStatus;
  sentAt?: string;
  brandAssignment?: BrandAssignment;
}

export interface TeamMembersResponse {
  members: TeamMember[];
  invites: TeamMember[];
}

export interface InviteMemberInput {
  email: string;
  role: OrgRole;
}

export interface UpdateMemberInput {
  role: OrgRole;
}
