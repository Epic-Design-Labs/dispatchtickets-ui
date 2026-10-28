'use client';

import { useState } from 'react';
import { Ticket as TicketIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConvertChatDialog } from '@/components/chat/convert-chat-dialog';
import type { ConvertChatResult } from '@/lib/api/chat';
import type { Ticket } from '@/types';

/** "Turn into ticket" on a live chat. Renders nothing for anything else. */
export function ConvertChatButton({
  brandId,
  ticket,
  onConverted,
  size = 'sm',
}: {
  brandId: string;
  ticket: Ticket;
  onConverted?: (result: ConvertChatResult) => void;
  size?: 'sm' | 'default';
}) {
  const [open, setOpen] = useState(false);
  if (ticket.source !== 'chat' || ticket.chatConvertedAt || ticket.isSpam) return null;

  return (
    <>
      <Button size={size} variant="outline" onClick={() => setOpen(true)}>
        <TicketIcon className="mr-1.5 h-4 w-4" />
        Turn into ticket
      </Button>
      {/* Mounted only while open, so each opening starts from the current ticket. */}
      {open && (
        <ConvertChatDialog
          brandId={brandId}
          ticket={ticket}
          open={open}
          onOpenChange={setOpen}
          onConverted={onConverted}
        />
      )}
    </>
  );
}
