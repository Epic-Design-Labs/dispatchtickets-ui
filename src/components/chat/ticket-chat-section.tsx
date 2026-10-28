'use client';

import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTimeAgo } from '@/lib/utils';
import { useChatVisitor, useResendChatConfirmation } from '@/lib/hooks/use-chat';
import type { ChatVisitor } from '@/lib/api/chat';

/**
 * Right-rail section for a chat ticket: whether the visitor is still on the
 * page (so whether a reply lands live or waits), and what they told us.
 *
 * Everything under "visitor" was sent by an anonymous browser. It renders as
 * text, never as a link, and the email is labelled for what it is.
 */
export function TicketChatSection({
  brandId,
  ticketId,
  isChat,
  converted = false,
}: {
  brandId: string;
  ticketId: string;
  isChat: boolean;
  /** Turned into an email ticket: replies go by email, not to the chat. */
  converted?: boolean;
}) {
  const { data } = useChatVisitor(brandId, ticketId, isChat);
  if (!isChat || !data) return null;

  const { visitor } = data;
  const rows: [string, string | undefined][] = [
    ['Page', visitor.pageUrl],
    ['Referrer', visitor.referrer],
    ['Locale', visitor.locale],
    ['Browser', visitor.userAgent],
  ];

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Chat visitor
          </div>
          {data.blocked ? (
            <Badge variant="destructive">Blocked</Badge>
          ) : data.present ? (
            <Badge className="bg-green-600 hover:bg-green-600">On the page</Badge>
          ) : (
            <Badge variant="secondary">Left {formatTimeAgo(data.lastSeenAt)}</Badge>
          )}
        </div>

        {converted && (
          <ConversionStatus brandId={brandId} ticketId={ticketId} confirmation={data.emailConfirmation} />
        )}

        <p className="text-xs text-muted-foreground">
          {converted
            ? 'Turned into a ticket: replies go by email, not to their chat.'
            : data.blocked
            ? "Marked as spam. They aren't told: what they send is kept here, but nobody is alerted. Restore it from Spam to lift this."
            : data.present
              ? 'Replies appear in their chat right away.'
              : data.verified
                ? 'Replies are emailed to them, and wait in the conversation for when they come back.'
                : 'Replies wait in the conversation until they come back. They are not emailed.'}
        </p>

        {data.verified && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Signed-in user</div>
            <div className="flex items-center gap-2">
              <span className="text-sm break-all">
                {data.verified.name ? `${data.verified.name} · ` : ''}
                {data.verified.email}
              </span>
              <Badge className="bg-green-600 hover:bg-green-600">Verified</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Confirmed by your app ({data.verified.userId}). Replies are emailed to them if they leave.
            </p>
          </div>
        )}

        {!data.verified && data.claimedEmail && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Email they typed</div>
            <div className="flex items-center gap-2">
              <span className="text-sm break-all">{data.claimedEmail}</span>
              <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
                Unverified
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone can type any address. Don&apos;t share account details on the strength of it.
            </p>
          </div>
        )}

        <dl className="space-y-1 text-sm">
          {rows
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="grid grid-cols-[72px_1fr] gap-2">
                <dt className="text-xs text-muted-foreground pt-0.5">{label}</dt>
                <dd className="break-all text-xs">{value}</dd>
              </div>
            ))}
        </dl>
      </div>
    </>
  );
}

function ConversionStatus({
  brandId,
  ticketId,
  confirmation,
}: {
  brandId: string;
  ticketId: string;
  confirmation: ChatVisitor['emailConfirmation'];
}) {
  const resend = useResendChatConfirmation(brandId, ticketId);
  if (!confirmation) return null;

  const onResend = async () => {
    try {
      const { email } = await resend.mutateAsync();
      toast.success(`Sent the confirmation to ${email} again`);
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(typeof message === 'string' ? message : 'Failed to resend');
    }
  };

  return (
    <div className="space-y-1 rounded-md border bg-background p-2">
      <div className="flex items-center gap-2">
        <span className="text-sm break-all">{confirmation.email}</span>
        {confirmation.confirmedAt ? (
          <Badge className="bg-green-600 hover:bg-green-600">Confirmed</Badge>
        ) : confirmation.expired ? (
          <Badge variant="secondary">Expired</Badge>
        ) : (
          <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
            Awaiting confirmation
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {confirmation.confirmedAt
          ? `Confirmed ${formatTimeAgo(confirmation.confirmedAt)}. The ticket and conversation were emailed.`
          : `Confirmation sent ${formatTimeAgo(confirmation.sentAt)}. Nothing else is emailed until they confirm.`}
      </p>
      {!confirmation.confirmedAt && confirmation.canResend && (
        <Button size="sm" variant="outline" onClick={onResend} disabled={resend.isPending}>
          Resend confirmation
        </Button>
      )}
    </div>
  );
}
