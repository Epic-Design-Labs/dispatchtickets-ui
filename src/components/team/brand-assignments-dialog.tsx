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

  // Sync state when data loads
  useEffect(() => {
    if (data) {
      setAllBrands(data.allBrands);
      setSelectedBrandIds(data.brandIds || []);
    }
  }, [data]);

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Brand Access</DialogTitle>
          <DialogDescription>
            Configure which brands {memberName} can access.
            {!canModify && member.role === 'owner' && (
              <span className="block mt-1 text-amber-600">
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
                  Or select specific brands
                </span>
              </div>
            </div>

            {/* Individual brand toggles */}
            <div className="space-y-2">
              {data?.availableBrands.map((brand) => {
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
