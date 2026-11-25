export type OrgRole = 'owner' | 'admin' | 'member';

export type MemberStatus = 'active' | 'pending';

export interface BrandAssignment {
  allBrands: boolean;
  brandIds: string[];
  groupIds?: string[];
  /** Names of those groups, for display. */
  groupNames?: string[];
}

/** A named set of brands; members in it reach its brands, live. */
export interface BrandGroup {
  id: string;
  name: string;
  brandIds: string[];
  memberCount: number;
  /** Members (and invites) who reach brands only through this group. */
  soleAccessCount: number;
}

export interface BrandGroupInput {
  name?: string;
  brandIds?: string[];
}

export interface AvailableBrand {
  id: string;
  name: string;
}

export interface BrandAssignmentResponse {
  memberId: string;
  allBrands: boolean;
  brandIds: string[];
  groupIds: string[];
  availableBrands: AvailableBrand[];
  availableGroups: { id: string; name: string; brandIds: string[] }[];
}

export interface UpdateBrandAssignmentsInput {
  allBrands: boolean;
  brandIds?: string[];
  groupIds?: string[];
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
  avatarUrl?: string;
}

export interface TeamMembersResponse {
  members: TeamMember[];
  invites: TeamMember[];
}

export interface InviteMemberInput {
  email: string;
  role: OrgRole;
  allBrands?: boolean;
  brandIds?: string[];
  groupIds?: string[];
}

export interface UpdateMemberInput {
  role: OrgRole;
}
