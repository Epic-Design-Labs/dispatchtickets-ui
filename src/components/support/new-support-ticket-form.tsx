'use client';

import { useState } from 'react';
import { useSupportPortal, SupportTicket } from '@/lib/hooks/use-support-portal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface NewSupportTicketFormProps {
  onSuccess: (ticket: SupportTicket) => void;
  onCancel: () => void;
}

export function NewSupportTicketForm({ onSuccess, onCancel }: NewSupportTicketFormProps) {
  const { createTicket } = useSupportPortal();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    try {
      setSubmitting(true);

      // Generate idempotency key to prevent double submissions
      const idempotencyKey = `ticket-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const ticket = await createTicket(
        {
          title: title.trim(),
          body: body.trim() || undefined,
        },
        idempotencyKey
      );

      toast.success('Ticket created');
      onSuccess(ticket);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Create Support Ticket</h2>
        <p className="text-sm text-muted-foreground">
          Describe your issue and our team will get back to you.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Subject</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of your issue"
            disabled={submitting}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Description</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Provide details about your issue, including any steps to reproduce, error messages, or screenshots..."
            className="min-h-[150px] resize-none"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !title.trim()}>
          {submitting ? 'Creating...' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  );
}
