'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamMemberTable, InviteMemberDialog } from '@/components/team';
import { useTeamMembers } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { OrgRole } from '@/types';

export default function TeamPage() {
  const { session } = useAuth();
  const { data, isLoading } = useTeamMembers();

  const currentUserRole = (session?.orgRole as OrgRole) || 'member';
  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-muted-foreground">
            Manage your organization's team members and their roles
          </p>
        </div>
        {canInvite && <InviteMemberDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People who have access to your organization's workspaces and tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamMemberTable
            members={data?.members || []}
            invites={data?.invites || []}
            isLoading={isLoading}
            currentUserRole={currentUserRole}
          />
        </CardContent>
      </Card>
    </div>
  );
}
