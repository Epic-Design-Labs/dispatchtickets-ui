'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WebhooksPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="text-muted-foreground">
          Configure webhook endpoints to receive real-time notifications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Webhook management is under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You'll be able to create webhook endpoints to receive notifications when tickets are
            created, updated, or when comments are added. Webhooks are signed with HMAC-SHA256
            for security.
          </p>
          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium">Workspace ID</p>
            <code className="text-xs text-muted-foreground">{workspaceId}</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
