'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useTickets,
  useFieldsByEntity,
} from '@/lib/hooks';
import { Header } from '@/components/layout';
import { TicketTable } from '@/components/tickets';
import { CompanyCombobox } from '@/components/companies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { ArrowLeft, Building2, Mail, Plus, Trash2, Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CreateTicketForCustomerDialog } from '@/components/tickets/create-ticket-for-customer-dialog';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const customerId = params.customerId as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompanyId, setEditCompanyId] = useState<string | undefined>();
  const [editCompanyName, setEditCompanyName] = useState<string | undefined>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: customer, isLoading } = useCustomer(brandId, customerId);
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets(brandId, {
    // Filter tickets by this customer's email
  });
  const updateCustomer = useUpdateCustomer(brandId, customerId);
  const deleteCustomer = useDeleteCustomer(brandId);
  const { data: ticketFields } = useFieldsByEntity(brandId, 'ticket');

  // Filter tickets for this customer
  const customerTickets = ticketsData?.data?.filter(
    (t) => (t.customFields?.requesterEmail as string)?.toLowerCase() === customer?.email?.toLowerCase()
  ) || [];

  const startEditing = () => {
    setEditName(customer?.name || '');
    setEditCompanyId(customer?.companyId);
    setEditCompanyName(customer?.company?.name);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateCustomer.mutateAsync({
        name: editName || undefined,
        companyId: editCompanyId || undefined,
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
      router.push(`/brands/${brandId}/customers`);
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
            href={`/brands/${brandId}/customers`}
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
                  <CompanyCombobox
                    brandId={brandId}
                    value={editCompanyId}
                    companyName={editCompanyName}
                    onChange={(id, name) => {
                      setEditCompanyId(id);
                      setEditCompanyName(name);
                    }}
                    placeholder="Search or create company..."
                  />
                ) : customer.company ? (
                  <Link
                    href={`/brands/${brandId}/companies/${customer.company.id}`}
                    className="text-primary hover:underline"
                  >
                    {customer.company.name}
                  </Link>
                ) : (
                  <p className="text-muted-foreground">No company assigned</p>
                )}
              </div>

              {/* Notifications */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label>Email Notifications</Label>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Receive email updates for ticket activity
                  </p>
                  <Switch
                    checked={customer.notifyEmail !== false}
                    onCheckedChange={async (checked) => {
                      try {
                        await updateCustomer.mutateAsync({ notifyEmail: checked });
                        toast.success(checked ? 'Notifications enabled' : 'Notifications disabled');
                      } catch {
                        toast.error('Failed to update notification setting');
                      }
                    }}
                    disabled={updateCustomer.isPending}
                  />
                </div>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tickets</CardTitle>
                  <CardDescription>
                    All tickets from this customer
                  </CardDescription>
                </div>
                <CreateTicketForCustomerDialog
                  brandId={brandId}
                  customer={{
                    name: customer.name || '',
                    email: customer.email,
                  }}
                >
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Ticket
                  </Button>
                </CreateTicketForCustomerDialog>
              </div>
            </CardHeader>
            <CardContent>
              {customerTickets.length === 0 && !ticketsLoading ? (
                <p className="text-center text-muted-foreground py-8">
                  No tickets from this customer yet
                </p>
              ) : (
                <TicketTable
                  tickets={customerTickets}
                  brandId={brandId}
                  isLoading={ticketsLoading}
                  customFields={ticketFields}
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
