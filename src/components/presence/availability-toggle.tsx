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
/**
 * `full` is a sidebar-width row, `pill` sits beside the user's name, and `dot`
 * is the icon rail -- just the status light, with the label in the tooltip the
 * button's own title gives it.
 */
export type AvailabilityToggleVariant = 'full' | 'pill' | 'dot';

export function AvailabilityToggle({
  variant = 'full',
}: { variant?: AvailabilityToggleVariant } = {}) {
  const { data } = useMyPresence();
  const setPresence = useSetMyPresence();

  const intended = data?.intendedStatus ?? 'offline';
  const shown: PresenceStatus = intended === 'mixed' ? data!.status : intended;
  // Chose available, but nothing is keeping them reachable.
  const unreachable = data && intended !== 'offline' && !data.online;

  const label =
    (intended === 'mixed' ? 'Mixed' : PRESENCE_LABELS[shown]) + (unreachable ? ' · reconnecting' : '');

  const choose = (status: PresenceStatus) =>
    setPresence.mutate(status, {
      onError: () => toast.error('Could not update your availability'),
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title={`Availability: ${label}`}
          aria-label={`Availability: ${label}`}
          className={
            variant === 'dot'
              ? 'h-8 w-8 shrink-0 p-0'
              : variant === 'pill'
                ? 'h-7 shrink-0 gap-1.5 rounded-full border px-2 text-xs font-medium'
                : 'w-full justify-start gap-2 px-2 text-sm'
          }
        >
          <PresenceDot status={unreachable ? 'offline' : shown} />
          {variant !== 'dot' && (
            <>
              <span className="truncate">
                {intended === 'mixed' ? 'Mixed' : PRESENCE_LABELS[shown]}
                {unreachable && <span className="text-muted-foreground"> · reconnecting</span>}
              </span>
              <ChevronsUpDown
                className={
                  variant === 'pill'
                    ? 'text-muted-foreground h-3 w-3'
                    : 'text-muted-foreground ml-auto h-3.5 w-3.5'
                }
              />
            </>
          )}
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
