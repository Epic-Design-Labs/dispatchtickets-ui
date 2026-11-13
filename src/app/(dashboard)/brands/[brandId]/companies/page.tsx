'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCompanies, useCreateCompany } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandTile } from '@/components/brand-tile';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { Search, Building2, Plus } from 'lucide-react';

export default function CompaniesPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDomain, setNewCompanyDomain] = useState('');

  const { data, isLoading } = useCompanies(brandId, { search: search || undefined });
  const createCompany = useCreateCompany(brandId);

  const companies = data?.data || [];

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    try {
      await createCompany.mutateAsync({
        name: newCompanyName.trim(),
        domain: newCompanyDomain.trim() || undefined,
      });
      toast.success('Company created');
      setCreateDialogOpen(false);
      setNewCompanyName('');
      setNewCompanyDomain('');
    } catch {
      toast.error('Failed to create company');
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold tracking-tight">Companies</h2>
          </div>
          <p className="text-muted-foreground">
            Organizations linked to your contacts. A contact joins one automatically
            when their email domain matches.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search companies or domains"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Company
          </Button>
        </div>

        {isLoading ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[90px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-[9px]" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-14" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : companies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">
                {search ? `No companies match "${search}"` : 'No companies yet'}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {search
                  ? 'Try a name or domain.'
                  : 'Create companies to group contacts from the same organization.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          /* A table, not a stack of cards. Each company is a name, a domain, a
             count and a date -- four short values that line up into columns,
             and the card layout spent a whole row's height on each one, so
             four companies filled the screen where eleven fit here. */
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[90px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => {
                  const contactCount = company._count?.customers || 0;
                  return (
                    <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link
                          href={`/brands/${brandId}/companies/${company.id}`}
                          className="flex items-center gap-3"
                        >
                          {/* A square, not a circle: the mock reserves circles
                              for people and rounded squares for organizations,
                              and BrandTile already colours one from the name. */}
                          <BrandTile name={company.name} size="lg" />
                          <div>
                            <p className="font-medium text-sm">{company.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {company.domain || 'No domain'}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {contactCount ? (
                          contactCount
                        ) : (
                          <span className="text-muted-foreground/60">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(company.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/brands/${brandId}/companies/${company.id}`}>
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Company Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Company</DialogTitle>
            <DialogDescription>
              Add a company to group contacts from the same organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                placeholder="e.g., Acme Inc"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCompany();
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="domain">
                Email Domain <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="domain"
                placeholder="e.g., acme.com"
                value={newCompanyDomain}
                onChange={(e) => setNewCompanyDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCompany();
                }}
              />
              <p className="text-xs text-muted-foreground">
                Contacts with this email domain will be automatically linked to this company.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCompany} disabled={createCompany.isPending}>
              {createCompany.isPending ? 'Creating...' : 'Create Company'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
