'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleBadge } from './role-badge';
import { BrandAssignmentsDialog } from './brand-assignments-dialog';
import { TeamMember, OrgRole } from '@/types';
import { useUpdateMember, useRemoveMember } from '@/lib/hooks';
import { toast } from 'sonner';

interface TeamMemberTableProps {
  members: TeamMember[];
  invites: TeamMember[];
  isLoading?: boolean;
  currentUserRole?: OrgRole;
}

export function TeamMemberTable({
  members,
  invites,
  isLoading,
  currentUserRole,
}: TeamMemberTableProps) {
  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [brandDialogMember, setBrandDialogMember] = useState<TeamMember | null>(null);

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    setPendingAction(memberId);
    try {
      await updateMember.mutateAsync({ memberId, data: { role: newRole } });
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error('Failed to update role');
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemove = async (memberId: string, email: string) => {
    setPendingAction(memberId);
    try {
      await removeMember.mutateAsync(memberId);
      toast.success(`${email} has been removed`);
    } catch (error) {
      toast.error('Failed to remove member');
    } finally {
      setPendingAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Brands</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  const allMembers = [
    ...members.map((m) => ({ ...m, status: 'active' as const })),
    ...invites.map((i) => ({ ...i, status: 'pending' as const })),
  ];

  if (allMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border py-12">
        <svg
          className="mb-4 h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-lg font-medium">No team members</p>
        <p className="text-muted-foreground">Invite your first team member</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Brands</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {allMembers.map((member) => {
            const name =
              member.firstName || member.lastName
                ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                : null;
            const isOwner = member.role === 'owner';
            const isPending = member.status === 'pending';

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div>
                    {name && <p className="font-medium">{name}</p>}
                    <p className={name ? 'text-sm text-muted-foreground' : 'font-medium'}>
                      {member.email}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleBadge role={member.role} />
                </TableCell>
                <TableCell>
                  {isPending ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1"
                      onClick={() => setBrandDialogMember(member)}
                    >
                      <Badge variant="secondary">
                        {member.brandAssignment?.allBrands
                          ? 'All'
                          : member.brandAssignment?.workspaceIds?.length
                            ? `${member.brandAssignment.workspaceIds.length} brand${member.brandAssignment.workspaceIds.length === 1 ? '' : 's'}`
                            : 'All'}
                      </Badge>
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {isPending ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Pending
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canManageMembers && !isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={pendingAction === member.id}
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                            />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!isPending && (
                          <>
                            <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                            {member.role !== 'admin' && (
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member.id, 'admin')}
                              >
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            {member.role !== 'member' && (
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member.id, 'member')}
                              >
                                Make Member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleRemove(member.id, member.email)}
                        >
                          {isPending ? 'Cancel Invite' : 'Remove'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>

      {brandDialogMember && (
        <BrandAssignmentsDialog
          member={brandDialogMember}
          open={!!brandDialogMember}
          onOpenChange={(open) => !open && setBrandDialogMember(null)}
          currentUserRole={currentUserRole}
        />
      )}
    </>
  );
}
