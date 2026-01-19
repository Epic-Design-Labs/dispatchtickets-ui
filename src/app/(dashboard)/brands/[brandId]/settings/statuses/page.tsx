'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  useStatuses,
  useStatusStats,
  useCreateStatus,
  useUpdateStatus,
  useDeleteStatus,
  useReorderStatuses,
} from '@/lib/hooks/use-statuses';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  CircleDot,
  Lock,
  Info,
} from 'lucide-react';
import { TicketStatusObject } from '@/types/status';

const DEFAULT_COLORS = [
  '#10b981', // emerald (open)
  '#f59e0b', // amber (pending)
  '#22c55e', // green (resolved)
  '#6b7280', // gray (closed)
  '#ef4444', // red
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
];

interface StatusFormData {
  name: string;
  key: string;
  color: string;
  description: string;
}

export default function StatusesSettingsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const { data: statuses, isLoading } = useStatuses(brandId);
  const { data: statusStats } = useStatusStats(brandId);
  const createStatus = useCreateStatus(brandId);
  const updateStatus = useUpdateStatus(brandId);
  const deleteStatus = useDeleteStatus(brandId);
  const reorderStatuses = useReorderStatuses(brandId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TicketStatusObject | null>(null);
  const [deletingStatus, setDeletingStatus] = useState<TicketStatusObject | null>(null);
  const [form, setForm] = useState<StatusFormData>({
    name: '',
    key: '',
    color: '#3b82f6',
    description: '',
  });

  const handleOpenDialog = (status?: TicketStatusObject) => {
    if (status) {
      setEditingStatus(status);
      setForm({
        name: status.name,
        key: status.key,
        color: status.color || '#6366f1',
        description: status.description || '',
      });
    } else {
      setEditingStatus(null);
      setForm({ name: '', key: '', color: '#3b82f6', description: '' });
    }
    setDialogOpen(true);
  };

  const generateKey = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
  };

  const handleNameChange = (name: string) => {
    setForm({
      ...form,
      name,
      // Auto-generate key from name if not editing
      key: editingStatus ? form.key : generateKey(name),
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Status name is required');
      return;
    }

    if (!editingStatus && !form.key.trim()) {
      toast.error('Status key is required');
      return;
    }

    try {
      if (editingStatus) {
        await updateStatus.mutateAsync({
          statusId: editingStatus.id,
          data: {
            name: form.name.trim(),
            color: form.color,
            description: form.description.trim() || undefined,
          },
        });
        toast.success('Status updated');
      } else {
        await createStatus.mutateAsync({
          name: form.name.trim(),
          key: form.key.trim(),
          color: form.color,
          description: form.description.trim() || undefined,
        });
        toast.success('Status created');
      }
      setDialogOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(editingStatus ? 'Failed to update status' : `Failed to create status: ${message}`);
    }
  };

  const handleDelete = async () => {
    if (!deletingStatus) return;
    try {
      await deleteStatus.mutateAsync(deletingStatus.id);
      toast.success('Status deleted');
      setDeletingStatus(null);
    } catch {
      toast.error('Failed to delete status');
    }
  };

  const getStatusTicketCount = (statusId: string) => {
    const stat = statusStats?.find((s) => s.id === statusId);
    return stat?.ticketCount || 0;
  };

  // Separate system statuses from custom statuses
  const systemStatuses = statuses?.filter((s) => s.isSystem) || [];
  const customStatuses = statuses?.filter((s) => !s.isSystem) || [];

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">About Ticket Statuses</p>
            <p className="mt-1 text-blue-700 dark:text-blue-300">
              System statuses (Open, Pending, Resolved, Closed) cannot be deleted but their colors and descriptions can be customized.
              Create custom statuses to match your workflow, like &quot;In Progress&quot; or &quot;Waiting on Customer&quot;.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Statuses */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* System Statuses Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    System Statuses
                  </CardTitle>
                  <CardDescription>
                    Default statuses that cannot be deleted. You can customize their appearance.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {systemStatuses.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <div>
                        <span className="font-medium">{status.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({status.key})
                        </span>
                        {status.description && (
                          <p className="text-xs text-muted-foreground">
                            {status.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {getStatusTicketCount(status.id)} tickets
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(status)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Statuses Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CircleDot className="h-5 w-5" />
                    Custom Statuses
                  </CardTitle>
                  <CardDescription>
                    Create additional statuses to match your workflow.
                  </CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => handleOpenDialog()}>
                      <Plus className="mr-1 h-4 w-4" />
                      Add Status
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingStatus ? 'Edit Status' : 'Create Status'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingStatus
                          ? 'Update the status details.'
                          : 'Create a new status to use in your ticket workflow.'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="status-name">Name</Label>
                        <Input
                          id="status-name"
                          placeholder="e.g., In Progress"
                          value={form.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                        />
                      </div>
                      {!editingStatus && (
                        <div className="space-y-2">
                          <Label htmlFor="status-key">Key</Label>
                          <Input
                            id="status-key"
                            placeholder="e.g., in_progress"
                            value={form.key}
                            onChange={(e) =>
                              setForm({ ...form, key: e.target.value })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Lowercase, alphanumeric, and underscores only. Used for API access.
                          </p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="status-description">Description (optional)</Label>
                        <Input
                          id="status-description"
                          placeholder="e.g., Ticket is being worked on"
                          value={form.description}
                          onChange={(e) =>
                            setForm({ ...form, description: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex flex-wrap gap-2">
                          {DEFAULT_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                                form.color === color
                                  ? 'border-foreground scale-110'
                                  : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setForm({ ...form, color })}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={createStatus.isPending || updateStatus.isPending}
                      >
                        {(createStatus.isPending || updateStatus.isPending) ? 'Saving...' : 'Save'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {customStatuses.length > 0 ? (
                <div className="space-y-2">
                  {customStatuses.map((status) => (
                    <div
                      key={status.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <div>
                          <span className="font-medium">{status.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({status.key})
                          </span>
                          {status.description && (
                            <p className="text-xs text-muted-foreground">
                              {status.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {getStatusTicketCount(status.id)} tickets
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(status)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeletingStatus(status)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <CircleDot className="mb-2 h-8 w-8" />
                  <p>No custom statuses yet</p>
                  <p className="text-sm">Create statuses to match your workflow</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingStatus} onOpenChange={() => setDeletingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingStatus?.name}&quot;?
              {getStatusTicketCount(deletingStatus?.id || '') > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  Warning: This status has {getStatusTicketCount(deletingStatus?.id || '')} tickets.
                  Those tickets will keep their current status reference but may need to be updated.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
