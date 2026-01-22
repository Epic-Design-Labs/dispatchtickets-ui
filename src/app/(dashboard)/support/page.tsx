'use client';

import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book, Mail, MessageSquare, ExternalLink } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="flex flex-col">
      <Header title="Support" />
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Get Help</h2>
            <p className="text-muted-foreground">
              Find answers in our documentation or reach out to our team.
            </p>
          </div>

          {/* Support Options */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Documentation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5" />
                  Documentation
                </CardTitle>
                <CardDescription>
                  Learn how to use Dispatch Tickets with guides and API references.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href="https://dispatchtickets.com/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Docs
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Email Support */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Support
                </CardTitle>
                <CardDescription>
                  Have a question or need help? Send us an email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="mailto:support@dispatchtickets.com">
                    Contact Support
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Feature Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Feature Requests
                </CardTitle>
                <CardDescription>
                  Have an idea? Submit and vote on feature requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/feature-requests">
                    View Requests
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* API Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  API Status
                </CardTitle>
                <CardDescription>
                  Check the current status of Dispatch Tickets services.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href="https://status.dispatchtickets.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Status
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <a
                  href="https://dispatchtickets.com/docs/getting-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Getting Started Guide
                </a>
                <a
                  href="https://dispatchtickets.com/docs/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  API Reference
                </a>
                <a
                  href="https://dispatchtickets.com/docs/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Webhooks Documentation
                </a>
                <a
                  href="https://dispatchtickets.com/docs/email"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Email Integration Guide
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
