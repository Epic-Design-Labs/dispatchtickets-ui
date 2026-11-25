'use client';

import { useState } from 'react';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useBrands,
  useBrandGroups,
  useCreateBrandGroup,
  useDeleteBrandGroup,
  useUpdateBrandGroup,
} from '@/lib/hooks';
import type { BrandGroup } from '@/types';

function errorMessage(err: unknown): string | undefined {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Brand groups on the Team page (owners and admins only; the API enforces
 * it). A member put in a group reaches its brands, and editing the group
 * changes what all its members can reach.
 */
export function BrandGroupsSection() {
  const { data: groups, isLoading } = useBrandGroups();
  const { data: brands } = useBrands();
  const [editing, setEditing] = useState<BrandGroup | 'new' | null>(null);
  const [deleting, setDeleting] = useState<BrandGroup | null>(null);
  const deleteGroup = useDeleteBrandGroup();

  const brandName = new Map((brands ?? []).map((b) => [b.id, b.name]));

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const result = await deleteGroup.mutateAsync(deleting.id);
      toast.success(
        result.membersLeftWithoutBrands
          ? `Group deleted. ${plural(result.membersLeftWithoutBrands, 'member')} now ${
              result.membersLeftWithoutBrands === 1 ? 'has' : 'have'
            } no brand access.`
          : 'Group deleted'
      );
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err) ?? 'Failed to delete the group');
    }
  };

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Layers className="h-4 w-4" />
            Brand groups
          </h2>
          <p className="text-muted-foreground text-sm">
            Give members a group's brands from their page: click a person below, then turn the group on under Brand
            Access. Changing a group changes access for everyone in it.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-1 h-4 w-4" />
          New group
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : !groups?.length ? (
        <p className="text-muted-foreground text-sm">No groups yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {groups.map((group) => (
            <li key={group.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{group.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {group.brandIds.length
                    ? group.brandIds.map((id) => brandName.get(id) ?? id).join(', ')
                    : 'No brands'}
                </p>
              </div>
              <span className="text-muted-foreground text-xs">{plural(group.memberCount, 'member')}</span>
              <Button variant="ghost" size="icon" aria-label={`Edit ${group.name}`} onClick={() => setEditing(group)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${group.name}`}
                onClick={() => setDeleting(group)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <BrandGroupDialog
          group={editing === 'new' ? null : editing}
          brands={brands ?? []}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.memberCount
                ? `${plural(deleting.memberCount, 'member')} will lose the brands this group gives them.`
                : 'No members are in this group.'}
              {!!deleting?.soleAccessCount &&
                ` ${plural(deleting.soleAccessCount, 'member')} get${
                  deleting.soleAccessCount === 1 ? 's' : ''
                } brands only from this group and will have no brand access until you assign them again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteGroup.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteGroup.isPending}
            >
              {deleteGroup.isPending ? 'Deleting...' : 'Delete group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function BrandGroupDialog({
  group,
  brands,
  onClose,
}: {
  group: BrandGroup | null;
  brands: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [name, setName] = useState(group?.name ?? '');
  const [brandIds, setBrandIds] = useState<string[]>(group?.brandIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const createGroup = useCreateBrandGroup();
  const updateGroup = useUpdateBrandGroup();
  const saving = createGroup.isPending || updateGroup.isPending;

  const toggle = (id: string) =>
    setBrandIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('Give the group a name.');
    setError(null);
    try {
      if (group) {
        await updateGroup.mutateAsync({ groupId: group.id, data: { name: name.trim(), brandIds } });
        toast.success('Group updated');
      } else {
        await createGroup.mutateAsync({ name: name.trim(), brandIds });
        toast.success('Group created');
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err) ?? 'Failed to save the group');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[440px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{group ? 'Edit group' : 'New brand group'}</DialogTitle>
            <DialogDescription>
              {group?.memberCount
                ? `Changes apply to the ${plural(group.memberCount, 'member')} in this group straight away.`
                : 'Members you put in this group can open these brands.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="brand-group-name">Name</Label>
            <Input
              id="brand-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. EU stores"
              maxLength={80}
              autoFocus
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Brands</legend>
            <div className="max-h-[260px] space-y-1 overflow-y-auto rounded-lg border p-2">
              {brands.length ? (
                brands.map((brand) => (
                  <label
                    key={brand.id}
                    className="hover:bg-surface-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm"
                  >
                    <Checkbox checked={brandIds.includes(brand.id)} onCheckedChange={() => toggle(brand.id)} />
                    {brand.name}
                  </label>
                ))
              ) : (
                <p className="text-muted-foreground py-4 text-center text-sm">No brands yet.</p>
              )}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : group ? 'Save' : 'Create group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
