'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Mail, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const MAX_CC = 20;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

interface TicketCcProps {
  cc: string[];
  requesterEmail?: string | null;
  disabled?: boolean;
  onChange: (cc: string[]) => Promise<unknown>;
}

/**
 * People copied on every customer email about this ticket (Ticket.cc). The API
 * enforces the rules (lower-cased, no requester, max 20); this only saves a
 * round trip on the obvious mistakes.
 */
export function TicketCc({ cc, requesterEmail, disabled, onChange }: TicketCcProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const save = async (next: string[], message: string) => {
    try {
      await onChange(next);
      toast.success(message);
      return true;
    } catch {
      toast.error('Failed to update CC');
      return false;
    }
  };

  const add = async () => {
    const address = value.trim().toLowerCase();
    if (!EMAIL.test(address)) return toast.error('Enter an email address');
    if (address === requesterEmail?.toLowerCase()) return toast.error('The requester already gets every reply');
    if (cc.includes(address)) return toast.error('Already copied');
    if (cc.length >= MAX_CC) return toast.error(`At most ${MAX_CC} people can be copied`);
    if (await save([...cc, address], `${address} copied`)) {
      setValue('');
      setOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Mail className="h-4 w-4" />
          CC
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={disabled} aria-label="Add CC">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <Input
                type="email"
                autoFocus
                placeholder="name@example.com"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" className="h-8" disabled={disabled || !value.trim()}>
                Add
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Gets every reply to the customer by email. No portal access.
            </p>
          </PopoverContent>
        </Popover>
      </div>

      {cc.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {cc.map((address) => (
            <div
              key={address}
              className="inline-flex items-center gap-1 rounded-full bg-gray-200 pl-2 pr-1.5 py-0.5 text-xs text-gray-700"
              title={address}
            >
              <span className="max-w-[180px] truncate">{address}</span>
              <button
                type="button"
                onClick={() => save(cc.filter((a) => a !== address), `${address} removed`)}
                disabled={disabled}
                className="rounded-full p-0.5 hover:bg-gray-300"
                aria-label={`Remove ${address}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No one copied</p>
      )}
    </div>
  );
}
