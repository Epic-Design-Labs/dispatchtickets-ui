'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useContacts } from '@/lib/hooks';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PersonAvatar } from '@/components/person-avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils';
import { Search, Users, Building2 } from 'lucide-react';
import { CreateContactDialog } from '@/components/contacts/create-contact-dialog';

export default function ContactsPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  const [search, setSearch] = useState('');

  const { data, isLoading } = useContacts(brandId, { search: search || undefined });

  const contacts = data?.data || [];

  return (
    <div className="flex flex-col">
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold tracking-tight">Contacts</h2>
          </div>
          <p className="text-muted-foreground">
            Everyone who has contacted this brand. A contact is created the first time
            someone writes in.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email or company"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <CreateContactDialog brandId={brandId} />
        </div>

        {isLoading ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : contacts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">
                {search ? `No contacts match "${search}"` : 'No contacts yet'}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {search
                  ? 'Try a name, email or company.'
                  : 'Contacts will be created automatically when tickets are submitted.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <Link
                        href={`/brands/${brandId}/contacts/${contact.id}`}
                        className="flex items-center gap-3"
                      >
                        {/* The circle is PersonAvatar, not a hand-rolled Avatar:
                            it carries the palette colour and the shared
                            `brandInitials` helper, so "The BigCommerce Team"
                            reads as TB rather than the TH that a blind
                            slice(0, 2) produced here for a year. */}
                        <PersonAvatar
                          name={contact.name || contact.email}
                          imageUrl={contact.avatarUrl || undefined}
                        />
                        <div>
                          <p className="font-medium text-sm">
                            {contact.name || contact.email}
                          </p>
                          {contact.name && (
                            <p className="text-xs text-muted-foreground">
                              {contact.email}
                            </p>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {contact.company ? (
                        <span className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                          </span>
                          {contact.company.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">No company</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {contact._count?.tickets ? (
                        contact._count.tickets
                      ) : (
                        <span className="text-muted-foreground/60">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(contact.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
