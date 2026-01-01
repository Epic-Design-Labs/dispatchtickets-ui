'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamMemberTable, InviteMemberDialog } from '@/components/team';
import { useTeamMembers, useOrganization, useUpdateOrganization } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { OrgRole } from '@/types';
import { toast } from 'sonner';

export default function TeamPage() {
  const { session } = useAuth();
  const { data, isLoading } = useTeamMembers();
  const { data: org, isLoading: orgLoading } = useOrganization();
  const updateOrg = useUpdateOrganization();

  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (org) {
      setOrgName(org.name);
    }
  }, [org]);

  const currentUserRole = (session?.orgRole as OrgRole) || 'member';
  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  const handleSaveOrgName = async () => {
    if (!orgName.trim()) {
      toast.error('Organization name is required');
      return;
    }

    try {
      await updateOrg.mutateAsync(orgName.trim());
      toast.success('Organization name updated');
    } catch {
      toast.error('Failed to update organization name');
    }
  };

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

      <div className="space-y-6">
        {/* Organization Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
            <CardDescription>
              Your organization name is shown in invite emails and team member lists
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orgLoading ? (
              <Skeleton className="h-10 w-64" />
            ) : (
              <div className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    placeholder="e.g., Epic Design Labs"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-64"
                    disabled={!isOwner}
                  />
                </div>
                {isOwner && (
                  <Button onClick={handleSaveOrgName} disabled={updateOrg.isPending}>
                    {updateOrg.isPending ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>
            )}
            {!isOwner && (
              <p className="mt-2 text-sm text-muted-foreground">
                Only organization owners can change the organization name
              </p>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
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
    </div>
  );
}
