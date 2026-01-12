'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TeamMemberTable, InviteMemberDialog } from '@/components/team';
import { useTeamMembers, useOrganization, useUpdateOrganization, useTeamMetrics } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { OrgRole } from '@/types';
import { toast } from 'sonner';
import { ThumbsUp, TrendingUp, BarChart3 } from 'lucide-react';

function getCsatColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

export default function TeamPage() {
  const { session } = useAuth();
  const { data, isLoading } = useTeamMembers();
  const { data: org, isLoading: orgLoading } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const { data: teamMetrics, isLoading: metricsLoading } = useTeamMetrics();

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

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Team Performance
            </CardTitle>
            <CardDescription>
              Resolution and customer satisfaction metrics for your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : teamMetrics?.members && teamMetrics.members.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead className="text-right">Tickets Resolved</TableHead>
                    <TableHead className="text-right">CSAT Score</TableHead>
                    <TableHead className="text-right">Ratings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMetrics.members.map((member) => (
                    <TableRow key={member.memberId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {member.memberName || 'Unknown'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.memberEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{member.ticketsResolved}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {member.csatScore !== null ? (
                          <span className={`font-medium ${getCsatColor(member.csatScore)}`}>
                            {member.csatScore.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.csatCount > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <ThumbsUp className="h-4 w-4 text-green-500" />
                            <span className="text-sm">
                              {member.csatPositive}/{member.csatCount}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No ratings</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No performance data yet</p>
                <p className="text-sm mt-1">
                  Metrics will appear after team members resolve tickets
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              People who have access to your organization's brands and tickets
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
