'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useCompany,
  useUpdateCompany,
  useDeleteCompany,
  useCustomers,
} from '@/lib/hooks';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Globe, Trash2, Users, Mail } from 'lucide-react';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const companyId = params.companyId as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: company, isLoading } = useCompany(workspaceId, companyId);
  const { data: customersData, isLoading: customersLoading } = useCustomers(workspaceId);
  const updateCompany = useUpdateCompany(workspaceId, companyId);
  const deleteCompany = useDeleteCompany(workspaceId);

  // Filter customers belonging to this company
  const companyCustomers = customersData?.data?.filter(
    (c) => c.companyId === companyId
  ) || [];

  const startEditing = () => {
    setEditName(company?.name || '');
    setEditDomain(company?.domain || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateCompany.mutateAsync({
        name: editName || undefined,
        domain: editDomain || undefined,
      });
      toast.success('Company updated');
      setIsEditing(false);
    } catch {
      toast.error('Failed to update company');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCompany.mutateAsync(companyId);
      toast.success('Company deleted');
      router.push(`/brands/${workspaceId}/companies`);
    } catch {
      toast.error('Failed to delete company');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Company" />
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col">
        <Header title="Company Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <p className="text-lg font-medium">Company not found</p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title={company.name} />
      <div className="flex-1 p-6">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href={`/brands/${workspaceId}/companies`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Company Info</CardTitle>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={updateCompany.isPending}
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Icon & Name */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Company name"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-lg font-medium">{company.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {company._count?.customers || companyCustomers.length} customers
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Domain */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label>Email Domain</Label>
                </div>
                {isEditing ? (
                  <div className="space-y-1">
                    <Input
                      value={editDomain}
                      onChange={(e) => setEditDomain(e.target.value)}
                      placeholder="e.g., acme.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Customers with this email domain will be auto-linked to this company.
                    </p>
                  </div>
                ) : company.domain ? (
                  <p>{company.domain}</p>
                ) : (
                  <p className="text-muted-foreground">No domain set</p>
                )}
              </div>

              {/* Created */}
              <div className="text-sm text-muted-foreground">
                Created {new Date(company.createdAt).toLocaleDateString()}
              </div>

              {/* Delete */}
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Company
              </Button>
            </CardContent>
          </Card>

          {/* Customers */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customers
              </CardTitle>
              <CardDescription>
                All customers in this company
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : companyCustomers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No customers in this company yet
                </p>
              ) : (
                <div className="space-y-3">
                  {companyCustomers.map((customer) => (
                    <Link
                      key={customer.id}
                      href={`/brands/${workspaceId}/customers/${customer.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {customer.name?.slice(0, 2).toUpperCase() ||
                            customer.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {customer.name || customer.email}
                        </p>
                        {customer.name && (
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {customer._count?.tickets || 0} tickets
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this company? Customers in this company will be unlinked but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
