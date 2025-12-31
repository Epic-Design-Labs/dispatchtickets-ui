export type OrgRole = 'owner' | 'admin' | 'member';

export type MemberStatus = 'active' | 'pending';

export interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: OrgRole;
  status: MemberStatus;
  sentAt?: string;
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
