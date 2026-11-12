'use client';

import { useState } from 'react';
import { useWatchers, useAddWatcher, useRemoveWatcher, useTeamMembers } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Eye, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PersonAvatar } from '@/components/person-avatar';

interface TicketWatchersProps {
  brandId: string;
  ticketId: string;
}

export function TicketWatchers({ brandId, ticketId }: TicketWatchersProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { data: watchers, isLoading } = useWatchers(brandId, ticketId);
  const { data: teamData } = useTeamMembers({ brandId });
  const addWatcher = useAddWatcher(brandId, ticketId);
  const removeWatcher = useRemoveWatcher(brandId, ticketId);

  const teamMembers = teamData?.members || [];

  // Filter out team members who are already watchers
  const availableMembers = teamMembers.filter(
    (member) => !watchers?.some((w) => w.memberId === member.id)
  );

  const handleAddWatcher = async (memberId: string, memberEmail: string, memberName?: string) => {
    try {
      await addWatcher.mutateAsync({
        memberId,
        memberEmail,
        memberName,
      });
      setPopoverOpen(false);
      toast.success('Watcher added');
    } catch {
      toast.error('Failed to add watcher');
    }
  };

  const handleRemoveWatcher = async (memberId: string) => {
    try {
      await removeWatcher.mutateAsync(memberId);
      toast.success('Watcher removed');
    } catch {
      toast.error('Failed to remove watcher');
    }
  };

  const getMemberName = (member: typeof teamMembers[0]) => {
    if (member.firstName || member.lastName) {
      return [member.firstName, member.lastName].filter(Boolean).join(' ');
    }
    return member.email;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Eye className="h-4 w-4" />
          Watchers
        </div>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="end">
            <Command>
              <CommandInput placeholder="Search team members..." />
              <CommandList>
                <CommandEmpty>No team members available</CommandEmpty>
                <CommandGroup>
                  {availableMembers.map((member) => (
                    <CommandItem
                      key={member.id}
                      value={member.email}
                      onSelect={() =>
                        handleAddWatcher(member.id, member.email, getMemberName(member))
                      }
                    >
                      <div className="flex items-center gap-2">
                        <PersonAvatar name={getMemberName(member)} size="sm" />
                        <div className="flex flex-col">
                          <span className="text-sm">{getMemberName(member)}</span>
                          {(member.firstName || member.lastName) && (
                            <span className="text-xs text-muted-foreground">
                              {member.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : watchers && watchers.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {watchers.map((watcher) => (
            <div
              key={watcher.id}
              className="bg-secondary group inline-flex items-center gap-1 rounded-full py-0.5 pl-1 pr-1.5 text-sm"
              title={`${watcher.memberName || watcher.memberEmail}\nNotifications: Comment ${watcher.notifyOnComment ? 'on' : 'off'}, Status ${watcher.notifyOnStatusChange ? 'on' : 'off'}`}
            >
              <PersonAvatar
                name={watcher.memberName || watcher.memberEmail}
                size="sm"
                className="h-5 w-5 text-[9px]"
              />
              <span className="text-xs">
                {watcher.memberName || watcher.memberEmail.split('@')[0]}
              </span>
              <button
                onClick={() => handleRemoveWatcher(watcher.memberId)}
                className="hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                disabled={removeWatcher.isPending}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No watchers</p>
      )}
    </div>
  );
}
