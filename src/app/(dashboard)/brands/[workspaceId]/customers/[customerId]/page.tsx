'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useCompanies,
  useTickets,
} from '@/lib/hooks';
import { Header } from '@/components/layout';
import { TicketTable } from '@/components/tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ArrowLeft, Building2, Mail, Trash2 } from 'lucide-react';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const customerId = params.customerId as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompanyId, setEditCompanyId] = useState<string | undefined>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: customer, isLoading } = useCustomer(workspaceId, customerId);
  const { data: companiesData } = useCompanies(workspaceId);
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets(workspaceId, {
    // Filter tickets by this customer's email
  });
  const updateCustomer = useUpdateCustomer(workspaceId, customerId);
  const deleteCustomer = useDeleteCustomer(workspaceId);

  const companies = companiesData?.data || [];

  // Filter tickets for this customer
  const customerTickets = ticketsData?.data?.filter(
    (t) => (t.customFields?.requesterEmail as string)?.toLowerCase() === customer?.email?.toLowerCase()
  ) || [];

  const startEditing = () => {
    setEditName(customer?.name || '');
    setEditCompanyId(customer?.companyId);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateCustomer.mutateAsync({
        name: editName || undefined,
        companyId: editCompanyId || null,
      });
      toast.success('Customer updated');
      setIsEditing(false);
    } catch {
      toast.error('Failed to update customer');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomer.mutateAsync(customerId);
      toast.success('Customer deleted');
      router.push(`/brands/${workspaceId}/customers`);
    } catch {
      toast.error('Failed to delete customer');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Customer" />
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

  if (!customer) {
    return (
      <div className="flex flex-col">
        <Header title="Customer Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <p className="text-lg font-medium">Customer not found</p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title={customer.name || customer.email} />
      <div className="flex-1 p-6">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href={`/brands/${workspaceId}/customers`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Customer Info</CardTitle>
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
                      disabled={updateCustomer.isPending}
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar & Name */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={customer.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg">
                    {customer.name?.slice(0, 2).toUpperCase() ||
                      customer.email.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Customer name"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-lg font-medium">
                        {customer.name || 'No name'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {customer._count?.tickets || 0} tickets
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>

              {/* Company */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Label>Company</Label>
                </div>
                {isEditing ? (
                  <Select
                    value={editCompanyId || 'none'}
                    onValueChange={(v) => setEditCompanyId(v === 'none' ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No company</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : customer.company ? (
                  <Link
                    href={`/brands/${workspaceId}/companies/${customer.company.id}`}
                    className="text-primary hover:underline"
                  >
                    {customer.company.name}
                  </Link>
                ) : (
                  <p className="text-muted-foreground">No company assigned</p>
                )}
              </div>

              {/* Created */}
              <div className="text-sm text-muted-foreground">
                Customer since {new Date(customer.createdAt).toLocaleDateString()}
              </div>

              {/* Delete */}
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Customer
              </Button>
            </CardContent>
          </Card>

          {/* Tickets */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
              <CardDescription>
                All tickets from this customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customerTickets.length === 0 && !ticketsLoading ? (
                <p className="text-center text-muted-foreground py-8">
                  No tickets from this customer yet
                </p>
              ) : (
                <TicketTable
                  tickets={customerTickets}
                  workspaceId={workspaceId}
                  isLoading={ticketsLoading}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This will unlink them from all their tickets but won&apos;t delete the tickets themselves.
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
