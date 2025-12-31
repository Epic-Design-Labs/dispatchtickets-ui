'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Manage brand configuration and preferences
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Brand Settings</CardTitle>
            <CardDescription>
              General brand configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Settings management is under development. You'll be able to configure brand name,
              inbound email addresses, custom fields schema, and more.
            </p>
            <div className="mt-4 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Brand ID</p>
              <code className="text-xs text-muted-foreground">{workspaceId}</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inbound Email</CardTitle>
            <CardDescription>
              Email address for creating tickets via email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Inbound Address</p>
              <code className="text-xs text-muted-foreground">
                {workspaceId}@inbound.dispatchtickets.com
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
