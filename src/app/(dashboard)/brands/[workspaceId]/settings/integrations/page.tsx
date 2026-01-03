'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Copy, Plus, Trash2, Code, Zap, ExternalLink, ShoppingCart, Settings2, TicketIcon } from 'lucide-react';
import { useForms, useCreateForm, useUpdateForm, useDeleteForm } from '@/lib/hooks';
import { FormToken, CreateFormTokenDto } from '@/lib/api/forms';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';

export default function IntegrationsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const { data: forms, isLoading } = useForms(workspaceId);
  const createForm = useCreateForm(workspaceId);
  const updateForm = useUpdateForm(workspaceId);
  const deleteForm = useDeleteForm(workspaceId);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormToken | null>(null);
  const [newFormName, setNewFormName] = useState('');
  const [newFormSuccessUrl, setNewFormSuccessUrl] = useState('');
  const [editFormName, setEditFormName] = useState('');
  const [editFormSuccessUrl, setEditFormSuccessUrl] = useState('');
  const [editFormErrorUrl, setEditFormErrorUrl] = useState('');

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
          successUrl: editFormSuccessUrl.trim() || null,
          errorUrl: editFormErrorUrl.trim() || null,
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
    return `<form action="${endpoint}" method="POST">
  <input type="email" name="email" placeholder="Your email" required>
  <input type="text" name="name" placeholder="Your name">
  <input type="text" name="subject" placeholder="Subject" required>
  <textarea name="message" placeholder="How can we help?" required></textarea>
  <button type="submit">Submit</button>
</form>`;
  };

  const getFetchCode = (form: FormToken) => {
    const endpoint = getFormEndpoint(form.token);
    return `fetch("${endpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    name: "John Doe",
    subject: "Help needed",
    message: "I need assistance with..."
  })
})
.then(res => res.json())
.then(data => console.log(data));`;
  };

  const apiEndpoint = `${API_BASE_URL}/workspaces/${workspaceId}/tickets`;

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
      {/* API Endpoint Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle>API Endpoint</CardTitle>
          </div>
          <CardDescription>
            Push tickets directly via API from automation tools like Make.com, n8n, or Zapier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="endpoint">
            <TabsList>
              <TabsTrigger value="endpoint">Endpoint</TabsTrigger>
              <TabsTrigger value="make">Make.com</TabsTrigger>
              <TabsTrigger value="n8n">n8n</TabsTrigger>
              <TabsTrigger value="zapier">Zapier</TabsTrigger>
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

            <TabsContent value="make" className="space-y-4 mt-4">
              <div className="prose prose-sm max-w-none">
                <h4 className="text-sm font-medium">Setup in Make.com</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Add an <strong>HTTP</strong> module to your scenario</li>
                  <li>Select <strong>Make a request</strong></li>
                  <li>Set URL to: <code className="bg-muted px-1 rounded">{apiEndpoint}</code></li>
                  <li>Set Method to <strong>POST</strong></li>
                  <li>Add Header: <code className="bg-muted px-1 rounded">Authorization: Bearer YOUR_API_KEY</code></li>
                  <li>Add Header: <code className="bg-muted px-1 rounded">Content-Type: application/json</code></li>
                  <li>Set Body type to <strong>Raw</strong> and paste the JSON payload</li>
                </ol>
              </div>
              <Button variant="outline" asChild>
                <a href="https://www.make.com/en/integrations/http" target="_blank" rel="noopener noreferrer">
                  Make.com HTTP Docs <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </TabsContent>

            <TabsContent value="n8n" className="space-y-4 mt-4">
              <div className="prose prose-sm max-w-none">
                <h4 className="text-sm font-medium">Setup in n8n</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Add an <strong>HTTP Request</strong> node</li>
                  <li>Set Method to <strong>POST</strong></li>
                  <li>Set URL to: <code className="bg-muted px-1 rounded">{apiEndpoint}</code></li>
                  <li>Under Authentication, select <strong>Generic Credential Type</strong> → <strong>Header Auth</strong></li>
                  <li>Create credential with Name: <code className="bg-muted px-1 rounded">Authorization</code> and Value: <code className="bg-muted px-1 rounded">Bearer YOUR_API_KEY</code></li>
                  <li>Set Body Content Type to <strong>JSON</strong> and add your payload</li>
                </ol>
              </div>
              <Button variant="outline" asChild>
                <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/" target="_blank" rel="noopener noreferrer">
                  n8n HTTP Docs <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </TabsContent>

            <TabsContent value="zapier" className="space-y-4 mt-4">
              <div className="prose prose-sm max-w-none">
                <h4 className="text-sm font-medium">Setup in Zapier</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Add a <strong>Webhooks by Zapier</strong> action</li>
                  <li>Choose <strong>POST</strong> as the action event</li>
                  <li>Set URL to: <code className="bg-muted px-1 rounded">{apiEndpoint}</code></li>
                  <li>Set Payload Type to <strong>json</strong></li>
                  <li>Add your data fields (title, body, customFields, etc.)</li>
                  <li>Under Headers, add: <code className="bg-muted px-1 rounded">Authorization | Bearer YOUR_API_KEY</code></li>
                </ol>
              </div>
              <Button variant="outline" asChild>
                <a href="https://zapier.com/apps/webhook/integrations" target="_blank" rel="noopener noreferrer">
                  Zapier Webhooks <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
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
                <CardTitle>Form Submissions</CardTitle>
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
              <p className="text-sm">Create a form to start accepting submissions</p>
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
                            <a href={`/brands/${workspaceId}?source=web&formId=${form.id}`}>
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

      {/* E-commerce Connections Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>E-commerce Connections</CardTitle>
              <CardDescription>
                Connect your e-commerce platform to sync customer data and create tickets from orders
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* BigCommerce */}
            <div className="border rounded-lg p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded bg-[#121118] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                    <path d="M12.006 18.985L3.607 12.88l1.876-1.397 6.523 4.854 6.52-4.856 1.877 1.4-8.397 6.104zm0-4.166L3.607 8.714l8.399-6.103 8.397 6.103-8.397 6.105z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">BigCommerce</h3>
                  <p className="text-sm text-muted-foreground">Sync orders and customers</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically create tickets from BigCommerce orders and access customer purchase history.
              </p>
              <Button variant="outline" className="mt-4 w-full" disabled>
                Connect BigCommerce
              </Button>
            </div>

            {/* Shopify */}
            <div className="border rounded-lg p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded bg-[#95BF47] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                    <path d="M15.337 3.415c-.022-.165-.181-.247-.301-.259-.12-.011-2.448-.18-2.448-.18l-1.8-1.8c-.18-.18-.533-.126-.67-.087L8.93 1.5c-.373-1.07-1.03-2.053-2.185-2.053h-.101C6.252-.782 5.786-1 5.384-1 2.079-1-.001 2.456-.001 6.796c0 3.327 1.16 6.326 3.108 8.216l.053.05 3.625 12.938 7.168-1.55s-3.886-25.928-3.916-26.128l5.3.093zm-4.2-1.7l-.938.292c-.01-.078-.02-.155-.034-.232-.343-1.656-1.496-2.455-2.768-2.455h-.003c-.08 0-.16.006-.24.016.036-.046.072-.09.11-.132.713-.796 1.62-1.183 2.698-1.153.853.025 1.713.295 2.173.538-.316.97-.651 2.365-.998 3.126zM8.047.896c.082-.022.168-.032.255-.032.912 0 1.778.69 2.177 1.865.254.748.41 1.68.492 2.414l-2.47.765c.264-1.615.03-3.663-.454-5.012zm-1.8.587c.14-.425.34-.807.59-1.123.089.025.172.07.244.134.797.717 1.13 1.94.863 3.36l-2.11.654c.123-.955.258-2.157.413-3.025z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Shopify</h3>
                  <p className="text-sm text-muted-foreground">Sync orders and customers</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically create tickets from Shopify orders and access customer purchase history.
              </p>
              <Button variant="outline" className="mt-4 w-full" disabled>
                Connect Shopify
              </Button>
            </div>
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
