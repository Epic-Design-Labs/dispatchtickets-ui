'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useContact,
  useUpdateContact,
  useDeleteContact,
  useTickets,
  useFieldsByEntity,
  useBulkAction,
  useTeamMembers,
  BulkActionType,
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
import { formatDateTime } from '@/lib/utils';
import { ArrowLeft, Building2, Mail, Plus, Trash2, Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CreateTicketForContactDialog } from '@/components/tickets/create-ticket-for-contact-dialog';
import { ContactOrdersCard } from '@/components/ecommerce';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const contactId = params.contactId as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompanyId, setEditCompanyId] = useState<string | undefined>();
  const [editCompanyName, setEditCompanyName] = useState<string | undefined>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: contact, isLoading } = useContact(brandId, contactId);
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets(brandId, {
    customerId: contactId,
    limit: 100,
  });
  const updateContact = useUpdateContact(brandId, contactId);
  const deleteContact = useDeleteContact(brandId);
  const { data: ticketFields } = useFieldsByEntity(brandId, 'ticket');
  const { data: teamMembersData } = useTeamMembers({ brandId });
  const teamMembers = teamMembersData?.members;
  const bulkAction = useBulkAction(brandId);

  const contactTickets = ticketsData?.data || [];

  const handleBulkAction = async (
    action: BulkActionType,
    ticketIds: string[],
    options?: { assigneeId?: string | null; categoryId?: string | null; tags?: string[]; closeReason?: string }
  ) => {
    try {
      const result = await bulkAction.mutateAsync({ action, ticketIds, ...options });
      const actionLabels: Record<BulkActionType, string> = {
        spam: 'marked as spam',
        resolve: 'resolved',
        close: 'closed',
        delete: 'deleted',
        assign: options?.assigneeId ? 'assigned' : 'unassigned',
        setCategory: options?.categoryId ? 'categorized' : 'uncategorized',
        setTags: 'tagged',
      };
      if (result.success > 0) {
        toast.success(`${result.success} ticket(s) ${actionLabels[action]}`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} ticket(s) failed`);
      }
    } catch {
      toast.error('Bulk action failed');
    }
  };

  const startEditing = () => {
    setEditName(contact?.name || '');
    setEditCompanyId(contact?.companyId);
    setEditCompanyName(contact?.company?.name);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateContact.mutateAsync({
        name: editName || undefined,
        companyId: editCompanyId || undefined,
      });
      toast.success('Contact updated');
      setIsEditing(false);
    } catch {
      toast.error('Failed to update contact');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContact.mutateAsync(contactId);
      toast.success('Contact deleted');
      router.push(`/brands/${brandId}/contacts`);
    } catch {
      toast.error('Failed to delete contact');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Contact" />
        <div className="flex-1 p-4 md:p-6">
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

  if (!contact) {
    return (
      <div className="flex flex-col">
        <Header title="Contact Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <p className="text-lg font-medium">Contact not found</p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title={contact.name || contact.email} />
      <div className="flex-1 p-4 md:p-6">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href={`/brands/${brandId}/contacts`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contact Info</CardTitle>
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
                      disabled={updateContact.isPending}
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
                  <AvatarImage src={contact.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg">
                    {contact.name?.slice(0, 2).toUpperCase() ||
                      contact.email.slice(0, 2).toUpperCase()}
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
                        placeholder="Contact name"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-lg font-medium">
                        {contact.name || 'No name'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contact._count?.tickets || 0} tickets
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{contact.email}</span>
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
                ) : contact.company ? (
                  <Link
                    href={`/brands/${brandId}/companies/${contact.company.id}`}
                    className="text-primary hover:underline"
                  >
                    {contact.company.name}
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
                    checked={contact.notifyEmail !== false}
                    onCheckedChange={async (checked) => {
                      try {
                        await updateContact.mutateAsync({ notifyEmail: checked });
                        toast.success(checked ? 'Notifications enabled' : 'Notifications disabled');
                      } catch {
                        toast.error('Failed to update notification setting');
                      }
                    }}
                    disabled={updateContact.isPending}
                  />
                </div>
              </div>

              {/* Created */}
              <div className="text-sm text-muted-foreground">
                Contact since {formatDateTime(contact.createdAt)}
              </div>

              {/* Delete */}
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Contact
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
                    All tickets from this contact
                  </CardDescription>
                </div>
                <CreateTicketForContactDialog
                  brandId={brandId}
                  contact={{
                    name: contact.name || '',
                    email: contact.email,
                  }}
                >
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Ticket
                  </Button>
                </CreateTicketForContactDialog>
              </div>
            </CardHeader>
            <CardContent>
              {contactTickets.length === 0 && !ticketsLoading ? (
                <p className="text-center text-muted-foreground py-8">
                  No tickets from this contact yet
                </p>
              ) : (
                <TicketTable
                  tickets={contactTickets}
                  brandId={brandId}
                  isLoading={ticketsLoading}
                  customFields={ticketFields}
                  teamMembers={teamMembers}
                  onBulkAction={handleBulkAction}
                />
              )}
            </CardContent>
          </Card>

          {/* Orders */}
          <ContactOrdersCard brandId={brandId} contactId={contactId} />
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact? This will unlink them from all their tickets but won&apos;t delete the tickets themselves.
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
