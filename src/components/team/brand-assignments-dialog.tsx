'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useBrandAssignments, useUpdateBrandAssignments } from '@/lib/hooks';
import { toast } from 'sonner';
import { TeamMember, OrgRole } from '@/types';

interface BrandAssignmentsDialogProps {
  member: TeamMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserRole?: OrgRole;
}

export function BrandAssignmentsDialog({
  member,
  open,
  onOpenChange,
  currentUserRole,
}: BrandAssignmentsDialogProps) {
  const { data, isLoading } = useBrandAssignments(open ? member.id : '');
  const updateBrandAssignments = useUpdateBrandAssignments();

  const [allBrands, setAllBrands] = useState(true);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Sync state when data loads
  useEffect(() => {
    if (data) {
      setAllBrands(data.allBrands);
      setSelectedBrandIds(data.brandIds || []);
      setSelectedGroupIds(data.groupIds || []);
    }
  }, [data]);

  const groups = data?.availableGroups ?? [];
  // Brand id -> names of the selected groups that grant it. Shown, not stored:
  // the API resolves groups live, so a brand added to a group later counts too.
  const viaGroups = new Map<string, string[]>();
  for (const group of groups) {
    if (!selectedGroupIds.includes(group.id)) continue;
    for (const brandId of group.brandIds) {
      viaGroups.set(brandId, [...(viaGroups.get(brandId) ?? []), group.name]);
    }
  }
  const reachable = new Set([...selectedBrandIds, ...viaGroups.keys()]);

  const handleGroupToggle = (groupId: string) => {
    if (allBrands) setAllBrands(false);
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  // Check if current user can modify this member's assignments
  const canModify = (() => {
    // Only owner can modify owner's assignments
    if (member.role === 'owner') {
      return currentUserRole === 'owner';
    }
    // Admins and owners can modify other members' assignments
    return currentUserRole === 'owner' || currentUserRole === 'admin';
  })();

  const handleAllBrandsChange = (checked: boolean) => {
    setAllBrands(checked);
    if (checked) {
      // When enabling "all brands", clear individual selections
      setSelectedBrandIds([]);
      setSelectedGroupIds([]);
    }
  };

  const handleBrandToggle = (brandId: string) => {
    // Toggling any individual brand should turn off "all brands"
    if (allBrands) {
      setAllBrands(false);
    }

    setSelectedBrandIds((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleSave = async () => {
    try {
      await updateBrandAssignments.mutateAsync({
        memberId: member.id,
        data: {
          allBrands,
          brandIds: allBrands ? [] : selectedBrandIds,
          groupIds: allBrands ? [] : selectedGroupIds,
        },
      });
      toast.success('Brand assignments updated');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update brand assignments');
    }
  };

  const memberName =
    member.firstName || member.lastName
      ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
      : member.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Brand Access</DialogTitle>
          <DialogDescription>
            Configure which brands {memberName} can access.
            {!canModify && member.role === 'owner' && (
              <span className="text-warning-foreground mt-1 block">
                Only the owner can modify their own brand access.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
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
                disabled={!canModify}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or select groups and brands
                </span>
              </div>
            </div>

            {/* Brand groups */}
            {groups.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Groups</p>
                {groups.map((group) => {
                  const isSelected = allBrands || selectedGroupIds.includes(group.id);
                  return (
                    <div
                      key={group.id}
                      className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                        allBrands ? 'opacity-50' : ''
                      }`}
                    >
                      <div>
                        <span className="font-medium">{group.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {group.brandIds.length} brand{group.brandIds.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <Switch
                        checked={isSelected}
                        onCheckedChange={() => handleGroupToggle(group.id)}
                        disabled={!canModify || allBrands}
                      />
                    </div>
                  );
                })}
                <p className="pt-1 text-sm font-medium">Individual brands</p>
              </div>
            )}

            {/* Individual brand toggles */}
            <div className="space-y-2">
              {data?.availableBrands.map((brand) => {
                const isSelected = allBrands || selectedBrandIds.includes(brand.id);
                const fromGroups = allBrands ? undefined : viaGroups.get(brand.id);
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
                      {fromGroups && (
                        <Badge variant="outline" className="text-xs">
                          via {fromGroups.join(', ')}
                        </Badge>
                      )}
                    </div>
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => handleBrandToggle(brand.id)}
                      disabled={!canModify || allBrands}
                    />
                  </div>
                );
              })}

              {data?.availableBrands.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No brands available. Create a workspace first.
                </p>
              )}
            </div>

            {!allBrands && (
              <p className="text-sm text-muted-foreground">
                {reachable.size === 0
                  ? `${memberName} will not be able to open any brand.`
                  : `${memberName} can open ${reachable.size} brand${reachable.size === 1 ? '' : 's'}.`}
                {selectedGroupIds.length > 0 && ' Brands added to a group later are included.'}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canModify || updateBrandAssignments.isPending || isLoading}
          >
            {updateBrandAssignments.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
