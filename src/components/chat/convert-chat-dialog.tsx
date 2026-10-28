'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useChatVisitor, useConvertChat } from '@/lib/hooks/use-chat';
import type { ConvertChatResult } from '@/lib/api/chat';
import type { Ticket } from '@/types';

function apiMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

const DELIVERED: Record<ConvertChatResult['delivery'], (email: string | null) => string> = {
  emailed: (email) => `Emailed the ticket and conversation to ${email}`,
  confirmation_sent: (email) => `Asked ${email} to confirm their address. The ticket is emailed once they do.`,
  no_email: () => 'No email address yet: add the customer to reply by email.',
  not_requested: () => 'Nothing was emailed.',
};

/**
 * Turn a chat into an email ticket. Same ticket: the agent writes the subject
 * and description, the visitor's opening message stays in the thread, and the
 * customer gets one email with the conversation. A typed address is asked to
 * confirm first -- the API enforces that, this only explains it.
 */
export function ConvertChatDialog({
  brandId,
  ticket,
  open,
  onOpenChange,
  onConverted,
}: {
  brandId: string;
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: (result: ConvertChatResult) => void;
}) {
  const { data: visitor } = useChatVisitor(brandId, ticket.id, open);
  const convert = useConvertChat(brandId, ticket.id);

  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [otherEmail, setOtherEmail] = useState('');
  const [useOther, setUseOther] = useState(false);
  const [notify, setNotify] = useState(true);

  const knownEmail =
    ticket.customer?.email ||
    (typeof ticket.customFields?.requesterEmail === 'string' ? ticket.customFields.requesterEmail : null) ||
    visitor?.verified?.email ||
    null;
  const claimedEmail = !knownEmail ? (visitor?.claimedEmail ?? null) : null;
  const askForEmail = !knownEmail && (!claimedEmail || useOther);
  const canSave = title.trim() && description.trim() && !convert.isPending;

  const submit = async () => {
    try {
      const result = await convert.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        ...(internalNote.trim() && { internalNote: internalNote.trim() }),
        ...(askForEmail && otherEmail.trim() && { email: otherEmail.trim() }),
        notifyCustomer: notify,
      });
      toast.success('Turned into a ticket', { description: DELIVERED[result.delivery](result.email) });
      onOpenChange(false);
      onConverted?.(result);
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to turn the chat into a ticket'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Turn into ticket</DialogTitle>
          <DialogDescription>
            It leaves the chat queue and continues by email. The conversation so far stays on the ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cc-title">Subject</Label>
            <Input id="cc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="cc-description">Description</Label>
              {ticket.body && !description && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => setDescription(ticket.body ?? '')}
                >
                  Start from their first message
                </button>
              )}
            </div>
            <Textarea
              id="cc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={20000}
              placeholder="What the customer needs, in your words. They'll see this."
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-note">
              Internal note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="cc-note"
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={2}
              maxLength={20000}
              placeholder="For your team only. Never sent."
            />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            {knownEmail ? (
              <p className="text-sm">
                Email the ticket and conversation to <strong className="break-all">{knownEmail}</strong>.
              </p>
            ) : claimedEmail && !useOther ? (
              <div className="space-y-1">
                <p className="text-sm">
                  They typed <strong className="break-all">{claimedEmail}</strong>. We&apos;ll ask them to confirm it,
                  then send the ticket.
                </p>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => setUseOther(true)}
                >
                  Use an address I know is theirs instead
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="cc-email">Customer email</Label>
                <Input
                  id="cc-email"
                  type="email"
                  value={otherEmail}
                  onChange={(e) => setOtherEmail(e.target.value)}
                  placeholder="name@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Only an address you know is theirs: it&apos;s used as-is. Leave it empty to add the customer later.
                </p>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
              Email the customer now
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={convert.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSave}>
            {convert.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Turn into ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
