'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Crown, Trash2 } from 'lucide-react';
import { useTeamMembers, useBrandAssignments, useUpdateMember, useUpdateBrandAssignments, useRemoveMember, useTransferOwnership } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { OrgRole, TeamMember } from '@/types';
import { toast } from 'sonner';

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;

  const { session } = useAuth();
  const { data: teamData, isLoading: teamLoading } = useTeamMembers();
  const { data: brandData, isLoading: brandLoading } = useBrandAssignments(memberId);
  const updateMember = useUpdateMember();
  const updateBrandAssignments = useUpdateBrandAssignments();
  const removeMember = useRemoveMember();
  const transferOwnership = useTransferOwnership();

  const [selectedRole, setSelectedRole] = useState<OrgRole>('member');
  const [allBrands, setAllBrands] = useState(true);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [hasRoleChanges, setHasRoleChanges] = useState(false);
  const [hasBrandChanges, setHasBrandChanges] = useState(false);

  // Find the member from team data
  const member = teamData
    ? [...teamData.members, ...teamData.invites].find((m) => m.id === memberId)
    : null;

  const currentUserRole = (session?.orgRole as OrgRole) || 'member';
  const isCurrentUserOwner = currentUserRole === 'owner';
  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isMemberOwner = member?.role === 'owner';
  const isPending = member?.status === 'pending';

  // Sync role state when member data loads
  useEffect(() => {
    if (member) {
      setSelectedRole(member.role as OrgRole);
    }
  }, [member]);

  // Sync brand state when brand data loads
  useEffect(() => {
    if (brandData) {
      setAllBrands(brandData.allBrands);
      setSelectedBrandIds(brandData.brandIds || []);
    }
  }, [brandData]);

  // Track changes
  useEffect(() => {
    if (member) {
      setHasRoleChanges(selectedRole !== member.role);
    }
  }, [selectedRole, member]);

  useEffect(() => {
    if (brandData) {
      const brandsChanged =
        allBrands !== brandData.allBrands ||
        JSON.stringify(selectedBrandIds.sort()) !== JSON.stringify((brandData.brandIds || []).sort());
      setHasBrandChanges(brandsChanged);
    }
  }, [allBrands, selectedBrandIds, brandData]);

  const handleRoleChange = async () => {
    if (!member || selectedRole === member.role) return;

    try {
      await updateMember.mutateAsync({ memberId, data: { role: selectedRole } });
      toast.success('Role updated successfully');
      setHasRoleChanges(false);
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleBrandsSave = async () => {
    try {
      await updateBrandAssignments.mutateAsync({
        memberId,
        data: {
          allBrands,
          brandIds: allBrands ? [] : selectedBrandIds,
        },
      });
      toast.success('Brand access updated');
      setHasBrandChanges(false);
    } catch (error) {
      toast.error('Failed to update brand access');
    }
  };

  const handleAllBrandsChange = (checked: boolean) => {
    setAllBrands(checked);
    if (checked) {
      setSelectedBrandIds([]);
    }
  };

  const handleBrandToggle = (brandId: string) => {
    if (allBrands) {
      setAllBrands(false);
    }
    setSelectedBrandIds((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleRemove = async () => {
    if (!member) return;
    try {
      await removeMember.mutateAsync(memberId);
      toast.success(`${member.email} has been removed`);
      router.push('/team');
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const handleTransferOwnership = async () => {
    if (!member) return;
    try {
      await transferOwnership.mutateAsync(memberId);
      toast.success(`Ownership transferred to ${member.email}`);
    } catch (error) {
      toast.error('Failed to transfer ownership');
    }
  };

  if (teamLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push('/team')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Team
        </Button>
        <div className="text-center py-12">
          <p className="text-lg font-medium">Member not found</p>
          <p className="text-muted-foreground">This member may have been removed.</p>
        </div>
      </div>
    );
  }

  const memberName =
    member.firstName || member.lastName
      ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
      : null;

  return (
    <div className="p-6 max-w-4xl">
      <Button variant="ghost" onClick={() => router.push('/team')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Team
      </Button>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          {memberName && <h1 className="text-2xl font-semibold">{memberName}</h1>}
          {isMemberOwner && (
            <Badge variant="secondary" className="text-amber-600">
              <Crown className="mr-1 h-3 w-3" />
              Owner
            </Badge>
          )}
          {isPending && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Pending Invite
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">{member.email}</p>
      </div>

      <div className="space-y-6">
        {/* Role Section */}
        {!isPending && (
          <Card>
            <CardHeader>
              <CardTitle>Role</CardTitle>
              <CardDescription>
                {isMemberOwner
                  ? 'The owner has full control over the organization.'
                  : 'Control what this member can do in the organization.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isMemberOwner ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-amber-600">
                      <Crown className="mr-1 h-3 w-3" />
                      Owner
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Full access to all settings and members
                    </span>
                  </div>
                  {isCurrentUserOwner && member.id !== session?.customerId && (
                    <p className="text-sm text-muted-foreground">
                      To change the owner, use &quot;Transfer Ownership&quot; below.
                    </p>
                  )}
                </div>
              ) : canManageMembers ? (
                <div className="flex items-center gap-4">
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as OrgRole)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleRoleChange}
                    disabled={!hasRoleChanges || updateMember.isPending}
                  >
                    {updateMember.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              ) : (
                <Badge variant="secondary">{member.role}</Badge>
              )}

              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Admin:</strong> Can manage team members and all settings</p>
                <p><strong>Member:</strong> Can view and respond to tickets</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Brand Access Section */}
        <Card>
            <CardHeader>
              <CardTitle>Brand Access</CardTitle>
              <CardDescription>
                Control which brands this member can access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brandLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* All brands toggle */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <p className="font-medium">All current and future brands</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically includes any new brands created
                      </p>
                    </div>
                    <Switch
                      checked={allBrands}
                      onCheckedChange={handleAllBrandsChange}
                      disabled={!canManageMembers}
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or select specific brands
                      </span>
                    </div>
                  </div>

                  {/* Individual brand toggles */}
                  <div className="space-y-2">
                    {brandData?.availableBrands.map((brand) => {
                      const isSelected = allBrands || selectedBrandIds.includes(brand.id);
                      return (
                        <div
                          key={brand.id}
                          className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                            allBrands ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{brand.name}</span>
                            {isSelected && !allBrands && (
                              <Badge variant="secondary" className="text-xs">
                                Selected
                              </Badge>
                            )}
                          </div>
                          <Switch
                            checked={isSelected}
                            onCheckedChange={() => handleBrandToggle(brand.id)}
                            disabled={!canManageMembers}
                          />
                        </div>
                      );
                    })}

                    {brandData?.availableBrands.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        No brands available. Create a brand first.
                      </p>
                    )}
                  </div>

                  {canManageMembers && (
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleBrandsSave}
                        disabled={!hasBrandChanges || updateBrandAssignments.isPending}
                      >
                        {updateBrandAssignments.isPending ? 'Saving...' : 'Save Brand Access'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        {/* Danger Zone */}
        {canManageMembers && !isMemberOwner && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for this member.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCurrentUserOwner && !isPending && (
                <div className="flex items-center justify-between rounded-lg border border-amber-200 p-4">
                  <div>
                    <p className="font-medium">Transfer Ownership</p>
                    <p className="text-sm text-muted-foreground">
                      Make this member the owner. You will become an admin.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <Crown className="mr-2 h-4 w-4" />
                        Transfer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to transfer ownership to{' '}
                          <span className="font-medium">{member.email}</span>?
                          <br /><br />
                          You will become an admin and lose owner privileges.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleTransferOwnership}
                          disabled={transferOwnership.isPending}
                        >
                          {transferOwnership.isPending ? 'Transferring...' : 'Transfer Ownership'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-red-200 p-4">
                <div>
                  <p className="font-medium text-red-600">
                    {isPending ? 'Cancel Invite' : 'Remove Member'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isPending
                      ? 'Cancel the pending invitation.'
                      : 'Remove this member from the organization.'}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isPending ? 'Cancel' : 'Remove'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {isPending ? 'Cancel Invite' : 'Remove Member'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to {isPending ? 'cancel the invite for' : 'remove'}{' '}
                        <span className="font-medium">{member.email}</span>?
                        {!isPending && (
                          <>
                            <br /><br />
                            They will lose access to all brands immediately.
                          </>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRemove}
                        disabled={removeMember.isPending}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {removeMember.isPending ? 'Removing...' : isPending ? 'Cancel Invite' : 'Remove Member'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
