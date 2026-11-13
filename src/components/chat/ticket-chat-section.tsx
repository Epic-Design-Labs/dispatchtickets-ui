'use client';

import type { ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Copy, MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatTimeAgo } from '@/lib/utils';
import { describeLocale, parseUserAgent, shortenUrl } from '@/lib/user-agent';
import { useChatVisitor, useResendChatConfirmation } from '@/lib/hooks/use-chat';
import type { ChatVisitor } from '@/lib/api/chat';

/**
 * Right-rail section for a chat ticket: whether the visitor is still on the
 * page (so whether a reply lands live or waits), and what they told us.
 *
 * Everything under "visitor" was sent by an anonymous browser. It renders as
 * text, never as a link, and the email is labelled for what it is. The URLs
 * get a copy button instead of an anchor for exactly that reason: copying is
 * the agent deciding to go somewhere, a link is us sending them.
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
  const userAgent = visitor.userAgent;
  const { browser, system } = parseUserAgent(userAgent);
  const language = describeLocale(visitor.locale);
  const hasDevice = browser || system || language;

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Chat visitor
          </div>
          {data.blocked ? (
            <Badge variant="destructive">Blocked</Badge>
          ) : data.present ? (
            <Badge className="bg-success hover:bg-success text-white">On the page</Badge>
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
              <Badge className="bg-success hover:bg-success text-white">Verified</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Confirmed by your app. Replies are emailed to them if they leave.
            </p>
            {/* The id your app vouched for. It belongs to the brand's own
                system, not ours, so it sits in its own labelled row instead
                of inside a sentence, where it read as noise. */}
            <div className="pt-1 text-xs text-muted-foreground">
              Your user ID <span className="font-mono break-all text-foreground">{data.verified.userId}</span>
            </div>
          </div>
        )}

        {!data.verified && data.claimedEmail && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Email they typed</div>
            <div className="flex items-center gap-2">
              <span className="text-sm break-all">{data.claimedEmail}</span>
              <Badge variant="outline" className="border-warning/40 text-warning-foreground">
                Unverified
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone can type any address. Don&apos;t share account details on the strength of it.
            </p>
          </div>
        )}

        <VisitorSection title="Conversation">
          <VisitorRow label="Started" value={formatTimeAgo(data.startedAt)} title={formatDateTime(data.startedAt)} />
          <VisitorRow
            label="Last seen"
            value={data.present ? 'On the page now' : formatTimeAgo(data.lastSeenAt)}
            title={formatDateTime(data.lastSeenAt)}
          />
        </VisitorSection>

        {(visitor.pageUrl || visitor.referrer) && (
          <VisitorSection title="Where they are">
            <UrlRow label="Current page" url={visitor.pageUrl} caption={visitor.title} />
            <UrlRow label="Came from" url={visitor.referrer} />
          </VisitorSection>
        )}

        {hasDevice && (
          <VisitorSection title="Device">
            {/* The raw user-agent hangs off the title attribute on both rows:
                the parse is a guess at a self-reported string, so the string
                itself stays one hover away rather than being discarded. */}
            <VisitorRow label="Browser" value={browser} title={userAgent} />
            <VisitorRow label="System" value={system} title={userAgent} />
            <VisitorRow label="Language" value={language} title={visitor.locale} />
          </VisitorSection>
        )}
      </div>
    </>
  );
}

function VisitorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function VisitorRow({ label, value, title }: { label: string; value: string | null | undefined; title?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate text-right" title={title}>
        {value}
      </span>
    </div>
  );
}

/**
 * A URL the visitor's browser reported, in a box with a copy button.
 *
 * Shortened for display only -- the clipboard and the tooltip both get the
 * whole thing, so what an agent pastes is exactly what was sent.
 */
function UrlRow({ label, url, caption }: { label: string; url?: string; caption?: string }) {
  if (!url) return null;
  return (
    <div className="flex items-start gap-1 rounded-md border bg-background px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="truncate text-xs" title={url}>
          {shortenUrl(url)}
        </div>
        {caption && <div className="truncate text-[11px] text-muted-foreground">{caption}</div>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        aria-label={`Copy ${label.toLowerCase()} link`}
        onClick={() => {
          navigator.clipboard.writeText(url);
          toast.success('Link copied');
        }}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
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
          <Badge className="bg-success hover:bg-success text-white">Confirmed</Badge>
        ) : confirmation.expired ? (
          <Badge variant="secondary">Expired</Badge>
        ) : (
          <Badge variant="outline" className="border-warning/40 text-warning-foreground">
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
