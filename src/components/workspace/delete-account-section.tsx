'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteAccount } from '@/lib/hooks';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

/**
 * Deleting the whole workspace. The button is disabled for anyone but the
 * owner, but that is only a hint: the API refuses non-owners with a 403.
 */
export function DeleteAccountSection({ isOwner, workspaceName }: { isOwner: boolean; workspaceName?: string }) {
  const deleteAccount = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  const handleDelete = async () => {
    if (confirmation !== 'DELETE') return;
    try {
      const result = await deleteAccount.mutateAsync({ confirmation: 'DELETE' });
      toast.success(result.message);
      setOpen(false);
      window.location.href = '/login';
    } catch {
      toast.error('Could not delete the workspace');
    }
  };

  return (
    <section className="border-destructive/40 rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="max-w-md">
          <h2 className="text-destructive flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Delete workspace
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Permanently deletes {workspaceName ?? 'this workspace'} with every brand, ticket and setting,
            and cancels the subscription.
            {!isOwner && ' Only the owner can do this.'}
          </p>
        </div>
        <Button variant="destructive" onClick={() => setOpen(true)} disabled={!isOwner}>
          Delete workspace
        </Button>
      </div>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirmation('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete this workspace?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This <strong>cannot be undone</strong>. It permanently deletes:
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  <li>Every brand and its settings</li>
                  <li>Every ticket, comment and attachment</li>
                  <li>All team members and their access</li>
                </ul>
                <p>
                  The subscription is cancelled too. Type <strong>DELETE</strong> to confirm.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="DELETE"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="font-mono"
            aria-label="Type DELETE to confirm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={confirmation !== 'DELETE' || deleteAccount.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {deleteAccount.isPending ? 'Deleting…' : 'Delete workspace'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
