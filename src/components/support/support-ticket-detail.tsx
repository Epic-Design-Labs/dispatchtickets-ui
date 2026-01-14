'use client';

import { useState, useEffect } from 'react';
import { useSupportPortal, SupportTicket, SupportComment } from '@/lib/hooks/use-support-portal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SupportTicketDetailProps {
  ticketId: string;
  onBack: () => void;
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'default',
  pending: 'secondary',
  resolved: 'outline',
  closed: 'outline',
};

export function SupportTicketDetail({ ticketId, onBack }: SupportTicketDetailProps) {
  const { getTicket, addComment, portalToken } = useSupportPortal();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTicket(ticketId);
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portalToken) {
      fetchTicket();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, portalToken]);

  const handleSubmitReply = async () => {
    if (!replyBody.trim()) return;

    try {
      setSubmitting(true);
      const comment = await addComment(ticketId, replyBody.trim());

      // Add comment to local state
      if (ticket) {
        setTicket({
          ...ticket,
          comments: [...(ticket.comments || []), comment],
        });
      }

      setReplyBody('');
      toast.success('Reply sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTicketNumber = (t: SupportTicket) => {
    const prefix = t.brand?.ticketPrefix || 'DT';
    return `${prefix}-${t.ticketNumber}`;
  };

  const getAuthorInitials = (comment: SupportComment) => {
    if (comment.authorName) {
      return comment.authorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return comment.authorType === 'AGENT' ? 'DT' : 'ME';
  };

  const getAuthorName = (comment: SupportComment) => {
    if (comment.authorName) return comment.authorName;
    return comment.authorType === 'AGENT' ? 'Support Team' : 'You';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={onBack}>
          Back to tickets
        </Button>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  const canReply = ticket.status === 'open' || ticket.status === 'pending';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to tickets
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground font-mono">
                {getTicketNumber(ticket)}
              </span>
              <Badge variant={STATUS_VARIANTS[ticket.status] || 'default'}>
                {ticket.status}
              </Badge>
            </div>
            <h1 className="text-xl font-semibold">
              {ticket.title}
            </h1>
          </div>
          <div className="text-sm text-muted-foreground text-right">
            <div>Created {formatDate(ticket.createdAt)}</div>
          </div>
        </div>
      </div>

      {/* Original message */}
      {ticket.body && (
        <div className="bg-muted rounded-lg p-4 mb-6">
          <div className="text-xs text-muted-foreground mb-2">Original message</div>
          <p className="whitespace-pre-wrap">{ticket.body}</p>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-4 mb-6">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Conversation
        </h2>

        {(!ticket.comments || ticket.comments.length === 0) && (
          <p className="text-muted-foreground text-sm py-4">
            No replies yet. Our team will respond soon.
          </p>
        )}

        {ticket.comments?.map((comment) => (
          <div
            key={comment.id}
            className={`flex gap-3 ${
              comment.authorType === 'CUSTOMER' ? 'flex-row-reverse' : ''
            }`}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className={
                comment.authorType === 'AGENT'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }>
                {getAuthorInitials(comment)}
              </AvatarFallback>
            </Avatar>
            <div
              className={`flex-1 max-w-[80%] ${
                comment.authorType === 'CUSTOMER' ? 'text-right' : ''
              }`}
            >
              <div
                className={`inline-block p-3 rounded-lg ${
                  comment.authorType === 'CUSTOMER'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {comment.authorType !== 'CUSTOMER' && (
                  <>
                    <span className="font-medium">{getAuthorName(comment)}</span>
                    <span>•</span>
                  </>
                )}
                <span>{formatDate(comment.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply form */}
      {canReply && (
        <div className="border-t pt-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Reply
          </h2>
          <div className="space-y-3">
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Type your reply..."
              className="min-h-[100px] resize-none"
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitReply}
                disabled={!replyBody.trim() || submitting}
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Closed ticket notice */}
      {!canReply && (
        <div className="border-t pt-6 text-center text-muted-foreground">
          <p>This ticket is {ticket.status}.</p>
          <p className="text-sm mt-1">
            Need more help?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={onBack}>
              Create a new ticket
            </Button>
          </p>
        </div>
      )}
    </div>
  );
}
