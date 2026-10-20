'use client';

import { toast } from 'sonner';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMyPresence, useSetMyPresence } from '@/lib/hooks/use-presence';
import type { PresenceStatus } from '@/lib/api/presence';
import { PRESENCE_LABELS, PresenceDot } from './presence-dot';

const CHOICES: PresenceStatus[] = ['available', 'busy', 'away', 'offline'];

/**
 * One switch for every brand this member covers (the API stamps a row per
 * brand). It records intent; whether they are actually reachable comes from
 * this tab's live connection, so closing the laptop goes offline on its own.
 */
export function AvailabilityToggle() {
  const { data } = useMyPresence();
  const setPresence = useSetMyPresence();

  const intended = data?.intendedStatus ?? 'offline';
  const shown: PresenceStatus = intended === 'mixed' ? data!.status : intended;
  // Chose available, but nothing is keeping them reachable.
  const unreachable = data && intended !== 'offline' && !data.online;

  const choose = (status: PresenceStatus) =>
    setPresence.mutate(status, {
      onError: () => toast.error('Could not update your availability'),
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2 text-sm">
          <PresenceDot status={unreachable ? 'offline' : shown} />
          <span className="truncate">
            {intended === 'mixed' ? 'Mixed' : PRESENCE_LABELS[shown]}
            {unreachable && <span className="text-muted-foreground"> · reconnecting</span>}
          </span>
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" side="top">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Your availability for chats, on every brand you cover
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CHOICES.map((status) => (
          <DropdownMenuItem key={status} onClick={() => choose(status)} className="cursor-pointer gap-2">
            <PresenceDot status={status} />
            {PRESENCE_LABELS[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
