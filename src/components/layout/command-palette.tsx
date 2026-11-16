'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  CreditCard,
  Inbox,
  Key,
  LifeBuoy,
  Lightbulb,
  MessageSquare,
  Plug,
  Ticket,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { BrandTile } from '@/components/brand-tile';
import { useBrands, useDashboardTickets, useDebounce } from '@/lib/hooks';
import { formatTicketNumber } from '@/lib/ticket-number';

/**
 * Jump anywhere with Cmd/Ctrl+K.
 *
 * Three kinds of thing, and deliberately only three. Pages and brands are
 * already in memory, so they filter as you type with no request at all.
 * Tickets are a search, so they wait for two characters and a quarter second.
 *
 * Contacts and companies are in the mock's palette and are missing here on
 * purpose: those endpoints are per brand, so a cross-brand lookup would mean
 * one request per brand, or quietly searching whichever brand happened to be
 * first -- which is what the prototype does, with a brand slug hardcoded. A
 * palette that searches one twelfth of your contacts without saying so is
 * worse than one that does not offer to.
 */

interface PageEntry {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Extra words that should match, beyond the label. */
  also?: string;
}

const PAGES: PageEntry[] = [
  { label: 'All active', href: '/dashboard', icon: Inbox, also: 'queue tickets' },
  { label: 'My tickets', href: '/dashboard?view=mine', icon: User, also: 'queue mine assigned' },
  { label: 'Unassigned', href: '/dashboard?view=unassigned', icon: Ticket, also: 'queue nobody' },
  { label: 'Chat', href: '/chat', icon: MessageSquare, also: 'live visitors' },
  { label: 'Statistics', href: '/stats', icon: BarChart3, also: 'stats reports' },
  { label: 'Brands', href: '/brands', icon: Building2, also: 'workspaces' },
  { label: 'Team', href: '/team', icon: Users, also: 'members' },
  { label: 'API keys', href: '/api-keys', icon: Key, also: 'tokens' },
  { label: 'Integrations', href: '/integrations', icon: Plug, also: 'connect apps' },
  { label: 'Plan and billing', href: '/billing', icon: CreditCard, also: 'subscription invoices' },
  { label: 'Profile settings', href: '/profile', icon: UserCog, also: 'signature notifications' },
  { label: 'Support', href: '/support', icon: LifeBuoy, also: 'help' },
  { label: 'Feature requests', href: '/feature-requests', icon: Lightbulb, also: 'roadmap ideas' },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const debounced = useDebounce(needle, 250);

  const { data: brands } = useBrands();

  // Two characters before asking the API anything: one letter matches most of
  // the table and tells nobody anything.
  const searching = open && debounced.length >= 2;
  const { data: ticketResults, isFetching } = useDashboardTickets(
    { search: debounced, limit: 6 },
    { enabled: searching }
  );

  /**
   * Open and close in one place, so the query is cleared with it.
   *
   * Each opening starts blank: a palette that remembers last time's search
   * makes the first keystroke edit a stale one instead of starting a new one.
   * Cleared HERE rather than in an effect watching `open`, which is a render
   * that schedules another render for something a handler already knows.
   */
  const show = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((was) => {
          if (was) setQuery('');
          return !was;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pages = useMemo(
    () =>
      needle
        ? PAGES.filter((page) =>
            `${page.label} ${page.also ?? ''}`.toLowerCase().includes(needle)
          )
        : PAGES.slice(0, 6),
    [needle]
  );

  const matchedBrands = useMemo(() => {
    const all = brands ?? [];
    const list = needle
      ? all.filter((brand) => brand.name.toLowerCase().includes(needle))
      : all.slice(0, 5);
    return list.slice(0, 8);
  }, [brands, needle]);

  const tickets = searching ? (ticketResults?.data ?? []) : [];

  const go = (href: string) => {
    show(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={show}>
      <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Search or jump to</DialogTitle>
        <DialogDescription className="sr-only">
          Find a page, a brand or a ticket.
        </DialogDescription>
        {/* cmdk's own filtering is off: pages and brands are filtered above,
            and the tickets come back already matched by the API -- letting
            cmdk score them again would drop a ticket found by its contact's
            email, because that text is not in the row. */}
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search pages, brands and tickets"
          />
          <CommandList className="max-h-[400px]">
            {pages.length === 0 && matchedBrands.length === 0 && tickets.length === 0 && (
              <CommandEmpty>
                {searching && isFetching ? 'Searching…' : `Nothing matches “${query.trim()}”.`}
              </CommandEmpty>
            )}

            {pages.length > 0 && (
              <CommandGroup heading="Pages">
                {pages.map((page) => (
                  <CommandItem
                    key={page.href}
                    value={page.href}
                    onSelect={() => go(page.href)}
                    className="gap-2.5"
                  >
                    <page.icon className="text-muted-foreground h-4 w-4" />
                    {page.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedBrands.length > 0 && (
              <CommandGroup heading="Brands">
                {matchedBrands.map((brand) => (
                  <CommandItem
                    key={brand.id}
                    value={`brand-${brand.id}`}
                    onSelect={() => go(`/brands/${brand.id}/tickets`)}
                    className="gap-2.5"
                  >
                    <BrandTile name={brand.name} iconUrl={brand.iconUrl} size="sm" />
                    {brand.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {tickets.length > 0 && (
              <CommandGroup heading="Tickets">
                {tickets.map((ticket) => (
                  <CommandItem
                    key={ticket.id}
                    value={`ticket-${ticket.id}`}
                    onSelect={() => go(`/brands/${ticket.brandId}/tickets/${ticket.id}`)}
                    className="gap-2.5"
                  >
                    <Ticket className="text-muted-foreground h-4 w-4" />
                    <span className="min-w-0 flex-1 truncate">{ticket.title}</span>
                    <span className="text-subtle shrink-0 font-mono text-xs">
                      {formatTicketNumber(ticket.brand?.ticketPrefix, ticket.ticketNumber)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
