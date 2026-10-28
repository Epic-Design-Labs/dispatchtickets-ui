'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  useSavedReplies,
  useCreateSavedReply,
  useUpdateSavedReply,
  useDeleteSavedReply,
} from '@/lib/hooks/use-saved-replies';
import { SAVED_REPLY_VARIABLES } from '@/lib/saved-reply-vars';
import type { SavedReply } from '@/types';

// Mirrors the API (saved-replies/dto): what can follow '#' in the reply box.
const SHORTCUT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

function apiMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export default function SavedRepliesSettingsPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  const { data: replies, isLoading } = useSavedReplies(brandId);
  const deleteReply = useDeleteSavedReply(brandId);
  const [editing, setEditing] = useState<SavedReply | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SavedReply | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteReply.mutateAsync(deleting.id);
      toast.success(`Deleted #${deleting.shortcut}`);
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to delete'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Saved Replies</CardTitle>
          <CardDescription>
            Type <span className="font-mono">#</span> in any reply box to insert one. Shared by everyone on this
            brand.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-1.5 h-4 w-4" />
          New reply
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !replies?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No saved replies yet. Start with the answers you type most often.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {replies.map((reply) => (
              <li key={reply.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground">#{reply.shortcut}</span>{' '}
                    <span className="font-medium">{reply.title}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">{reply.body}</p>
                </div>
                <Button size="icon" variant="ghost" aria-label={`Edit #${reply.shortcut}`} onClick={() => setEditing(reply)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete #${reply.shortcut}`}
                  onClick={() => setDeleting(reply)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {editing && (
        <SavedReplyDialog
          brandId={brandId}
          reply={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete #{deleting?.shortcut}?</AlertDialogTitle>
            <AlertDialogDescription>
              It stops appearing in the reply box for everyone on this brand. Replies already sent are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SavedReplyDialog({
  brandId,
  reply,
  onClose,
}: {
  brandId: string;
  reply: SavedReply | null;
  onClose: () => void;
}) {
  const create = useCreateSavedReply(brandId);
  const update = useUpdateSavedReply(brandId);
  const [shortcut, setShortcut] = useState(reply?.shortcut ?? '');
  const [title, setTitle] = useState(reply?.title ?? '');
  const [body, setBody] = useState(reply?.body ?? '');
  const saving = create.isPending || update.isPending;

  const normalized = shortcut.trim().replace(/^#/, '').toLowerCase();
  const shortcutValid = SHORTCUT_PATTERN.test(normalized);
  const canSave = shortcutValid && title.trim() && body.trim() && !saving;

  const save = async () => {
    const data = { shortcut: normalized, title: title.trim(), body };
    try {
      if (reply) await update.mutateAsync({ id: reply.id, data });
      else await create.mutateAsync(data);
      toast.success(`Saved #${normalized}`);
      onClose();
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to save'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{reply ? 'Edit saved reply' : 'New saved reply'}</DialogTitle>
          <DialogDescription>Agents insert it by typing # and the shortcut.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="sr-shortcut">Shortcut</Label>
              <div className="flex items-center rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
                <span className="pl-3 font-mono text-sm text-muted-foreground">#</span>
                <Input
                  id="sr-shortcut"
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="refund"
                  className="border-0 pl-1 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-title">Title</Label>
              <Input id="sr-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Refund policy" />
            </div>
          </div>
          {shortcut && !shortcutValid && (
            <p className="text-xs text-destructive">Lowercase letters, digits, - and _ only, no spaces (up to 40).</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="sr-body">Reply</Label>
            <Textarea
              id="sr-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              rows={7}
              placeholder="Hi {{customerFirstName}}, refunds take 5-7 business days to reach your card."
            />
            <p className="text-xs text-muted-foreground">
              Variables, filled in when inserted:{' '}
              {SAVED_REPLY_VARIABLES.map((v, i) => (
                <span key={v.key}>
                  {i > 0 && ', '}
                  <code className="font-mono" title={v.label}>{`{{${v.key}}}`}</code>
                </span>
              ))}
              . One with no value stays as written, so you&apos;ll see it before sending.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
