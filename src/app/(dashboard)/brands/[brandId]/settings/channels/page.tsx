'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Copy, Plus, Trash2, Code, Zap, ExternalLink, Settings2, TicketIcon, MessageSquare } from 'lucide-react';
import { useForms, useCreateForm, useUpdateForm, useDeleteForm } from '@/lib/hooks';
import { FormToken, CreateFormTokenDto } from '@/lib/api/forms';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';

export default function ChannelsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const { data: forms, isLoading } = useForms(brandId);
  const createForm = useCreateForm(brandId);
  const updateForm = useUpdateForm(brandId);
  const deleteForm = useDeleteForm(brandId);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormToken | null>(null);
  const [newFormName, setNewFormName] = useState('');
  const [newFormSuccessUrl, setNewFormSuccessUrl] = useState('');
  const [editFormName, setEditFormName] = useState('');
  const [editFormSuccessUrl, setEditFormSuccessUrl] = useState('');
  const [editFormErrorUrl, setEditFormErrorUrl] = useState('');
  const [editFormThankYouMessage, setEditFormThankYouMessage] = useState('');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleCreateForm = async () => {
    if (!newFormName.trim()) {
      toast.error('Please enter a form name');
      return;
    }

    try {
      const data: CreateFormTokenDto = {
        name: newFormName.trim(),
      };
      if (newFormSuccessUrl.trim()) {
        data.successUrl = newFormSuccessUrl.trim();
      }

      await createForm.mutateAsync(data);
      toast.success('Form created successfully');
      setCreateDialogOpen(false);
      setNewFormName('');
      setNewFormSuccessUrl('');
    } catch {
      toast.error('Failed to create form');
    }
  };

  const handleToggleForm = async (form: FormToken) => {
    try {
      await updateForm.mutateAsync({
        formId: form.id,
        data: { enabled: !form.enabled },
      });
      toast.success(form.enabled ? 'Form disabled' : 'Form enabled');
    } catch {
      toast.error('Failed to update form');
    }
  };

  const openEditDialog = (form: FormToken) => {
    setSelectedForm(form);
    setEditFormName(form.name);
    setEditFormSuccessUrl(form.successUrl || '');
    setEditFormErrorUrl(form.errorUrl || '');
    setEditFormThankYouMessage(form.thankYouMessage || '');
    setEditDialogOpen(true);
  };

  const handleEditForm = async () => {
    if (!selectedForm || !editFormName.trim()) {
      toast.error('Please enter a form name');
      return;
    }

    try {
      await updateForm.mutateAsync({
        formId: selectedForm.id,
        data: {
          name: editFormName.trim(),
          successUrl: editFormSuccessUrl.trim() || undefined,
          errorUrl: editFormErrorUrl.trim() || undefined,
          thankYouMessage: editFormThankYouMessage.trim() || undefined,
        },
      });
      toast.success('Form updated successfully');
      setEditDialogOpen(false);
      setSelectedForm(null);
    } catch {
      toast.error('Failed to update form');
    }
  };

  const handleDeleteForm = async () => {
    if (!selectedForm) return;

    try {
      await deleteForm.mutateAsync(selectedForm.id);
      toast.success('Form deleted');
      setDeleteDialogOpen(false);
      setSelectedForm(null);
    } catch {
      toast.error('Failed to delete form');
    }
  };

  const getFormEndpoint = (token: string) => `${API_BASE_URL}/forms/${token}`;

  const getEmbedCode = (form: FormToken) => {
    const endpoint = getFormEndpoint(form.token);
    return `<form action="${endpoint}" method="POST" enctype="multipart/form-data">
  <input type="email" name="email" placeholder="Your email" required>
  <input type="text" name="name" placeholder="Your name">
  <input type="text" name="subject" placeholder="Subject" required>
  <textarea name="message" placeholder="How can we help?" required></textarea>
  <input type="file" name="attachments" multiple>
  <button type="submit">Submit</button>
</form>`;
  };

  const getFetchCode = (form: FormToken) => {
    const endpoint = getFormEndpoint(form.token);
    return `// With file attachments (FormData)
const formData = new FormData();
formData.append("email", "user@example.com");
formData.append("name", "John Doe");
formData.append("subject", "Help needed");
formData.append("message", "I need assistance with...");
// Add files (optional)
// files.forEach(file => formData.append("attachments", file));

fetch("${endpoint}", {
  method: "POST",
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));`;
  };

  const apiEndpoint = `${API_BASE_URL}/brands/${brandId}/tickets`;

  const apiExamplePayload = `{
  "title": "Support request from automation",
  "body": "Customer needs help with...",
  "customFields": {
    "requesterEmail": "customer@example.com",
    "requesterName": "Jane Doe"
  },
  "priority": "high"
}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Channels</h2>
        <p className="text-muted-foreground">
          Configure how tickets can be created for this brand
        </p>
      </div>

      {/* API Endpoint Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle>API Endpoint</CardTitle>
          </div>
          <CardDescription>
            Push tickets directly via API from your application or automation tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="endpoint">
            <TabsList>
              <TabsTrigger value="endpoint">Endpoint</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>

            <TabsContent value="endpoint" className="space-y-4 mt-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Endpoint</Label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                    POST {apiEndpoint}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiEndpoint, 'Endpoint')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground uppercase">Headers</Label>
                <pre className="bg-muted px-3 py-2 rounded text-sm font-mono mt-1 overflow-x-auto">
{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}
                </pre>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground uppercase">Example Payload</Label>
                <div className="relative">
                  <pre className="bg-muted px-3 py-2 rounded text-sm font-mono mt-1 overflow-x-auto">
                    {apiExamplePayload}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(apiExamplePayload, 'Payload')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="curl" className="space-y-4 mt-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase">cURL Example</Label>
                <div className="relative">
                  <pre className="bg-muted px-3 py-2 rounded text-sm font-mono mt-1 overflow-x-auto whitespace-pre-wrap">
{`curl -X POST "${apiEndpoint}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${apiExamplePayload}'`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(`curl -X POST "${apiEndpoint}" -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" -d '${apiExamplePayload}'`, 'cURL command')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Get your API key from{' '}
                <a href="/api-keys" className="text-primary underline">
                  API Keys
                </a>
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Form Tokens Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Web Forms</CardTitle>
                <CardDescription>
                  Create embeddable forms that submit tickets without requiring API keys
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : forms?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No forms created yet</p>
              <p className="text-sm">Create a form to start accepting submissions from your website</p>
            </div>
          ) : (
            <div className="space-y-4">
              {forms?.map((form) => (
                <div
                  key={form.id}
                  className="border rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{form.name}</h3>
                      <Badge variant={form.enabled ? 'default' : 'secondary'}>
                        {form.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.enabled}
                        onCheckedChange={() => handleToggleForm(form)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(form)}
                        title="Edit form settings"
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedForm(form);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Endpoint</Label>
                      <div className="flex gap-2 mt-1">
                        <code className="flex-1 bg-muted px-2 py-1 rounded text-xs font-mono truncate">
                          {getFormEndpoint(form.token)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(getFormEndpoint(form.token), 'Endpoint')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Stats</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span>
                          {form.submissionCount} submissions
                          {form.lastSubmissionAt && (
                            <span className="text-muted-foreground">
                              {' '}· Last: {new Date(form.lastSubmissionAt).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                        {form.submissionCount > 0 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            asChild
                          >
                            <a href={`/brands/${brandId}?source=web&formId=${form.id}`}>
                              <TicketIcon className="h-3 w-3 mr-1" />
                              View tickets
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <Tabs defaultValue="html" className="mt-4">
                    <TabsList className="h-8">
                      <TabsTrigger value="html" className="text-xs">HTML Form</TabsTrigger>
                      <TabsTrigger value="js" className="text-xs">JavaScript</TabsTrigger>
                    </TabsList>
                    <TabsContent value="html" className="mt-2">
                      <div className="relative">
                        <pre className="bg-muted px-3 py-2 rounded text-xs font-mono overflow-x-auto max-h-48">
                          {getEmbedCode(form)}
                        </pre>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-7 w-7"
                          onClick={() => copyToClipboard(getEmbedCode(form), 'HTML code')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="js" className="mt-2">
                      <div className="relative">
                        <pre className="bg-muted px-3 py-2 rounded text-xs font-mono overflow-x-auto max-h-48">
                          {getFetchCode(form)}
                        </pre>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-7 w-7"
                          onClick={() => copyToClipboard(getFetchCode(form), 'JavaScript code')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Widget Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Chat Widget</CardTitle>
              <CardDescription>
                Add a chat widget to your website for real-time customer support
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit">Coming Soon</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Embeddable chat widget coming soon</p>
            <p className="text-sm">Allow customers to start conversations directly from your website</p>
            <Button variant="outline" className="mt-4" asChild>
              <a href="/feature-requests">
                Request this feature <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Form Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Form</DialogTitle>
            <DialogDescription>
              Create a form endpoint that can receive submissions without an API key
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Form Name</Label>
              <Input
                id="name"
                placeholder="e.g., Contact Form, Support Request"
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="successUrl">Success Redirect URL (optional)</Label>
              <Input
                id="successUrl"
                type="url"
                placeholder="https://yoursite.com/thank-you"
                value={newFormSuccessUrl}
                onChange={(e) => setNewFormSuccessUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Where to redirect after successful submission. Leave empty to show a thank you page.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateForm} disabled={createForm.isPending}>
              {createForm.isPending ? 'Creating...' : 'Create Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Form</DialogTitle>
            <DialogDescription>
              Update form settings and redirect URLs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Form Name</Label>
              <Input
                id="editName"
                placeholder="e.g., Contact Form, Support Request"
                value={editFormName}
                onChange={(e) => setEditFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editSuccessUrl">Success Redirect URL</Label>
              <Input
                id="editSuccessUrl"
                type="url"
                placeholder="https://yoursite.com/thank-you"
                value={editFormSuccessUrl}
                onChange={(e) => setEditFormSuccessUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Where to redirect after successful submission. Leave empty to show a thank you page.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editErrorUrl">Error Redirect URL</Label>
              <Input
                id="editErrorUrl"
                type="url"
                placeholder="https://yoursite.com/error"
                value={editFormErrorUrl}
                onChange={(e) => setEditFormErrorUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Where to redirect if submission fails. Leave empty to show an error message.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editThankYouMessage">Thank You Message</Label>
              <Textarea
                id="editThankYouMessage"
                placeholder="Thanks for reaching out! We will get back to you within 24 hours."
                value={editFormThankYouMessage}
                onChange={(e) => setEditFormThankYouMessage(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Custom message shown on the thank you page when no Success Redirect URL is set.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditForm} disabled={updateForm.isPending}>
              {updateForm.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedForm?.name}&quot;? This will stop all
              submissions to this form endpoint and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedForm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteForm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteForm.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
