'use client';

import { useState } from 'react';
import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupportPortal, SupportTicket } from '@/lib/hooks/use-support-portal';
import { SupportTicketList, SupportTicketDetail, NewSupportTicketForm } from '@/components/support';
import { Plus, AlertCircle, Book, ExternalLink, Mail, MessageSquare, RefreshCw } from 'lucide-react';

type View = 'list' | 'detail' | 'new';

export default function SupportPage() {
  const { loading, error, portalToken, refreshToken } = useSupportPortal();
  const [view, setView] = useState<View>('list');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setView('detail');
  };

  const handleBack = () => {
    setSelectedTicketId(null);
    setView('list');
  };

  const handleTicketCreated = (ticket: SupportTicket) => {
    setSelectedTicketId(ticket.id);
    setView('detail');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Support" />
        <div className="flex-1 p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-8 w-48 mb-6" />
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-10 w-40" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state - show fallback support options with actual error
  if (error) {
    return (
      <div className="flex flex-col">
        <Header title="Support" />
        <div className="flex-1 p-4 md:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Error Card */}
            <Card className="border-destructive/50">
              <CardContent className="p-6">
                <div className="text-center py-4">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                  <h2 className="text-lg font-semibold mb-2">Support Portal Error</h2>
                  <p className="text-muted-foreground mb-4 font-mono text-sm bg-muted p-2 rounded">
                    {error}
                  </p>
                  <Button variant="outline" onClick={() => refreshToken()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Fallback Support Options */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Alternative Support Options</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Documentation */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Book className="h-4 w-4" />
                      Documentation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href="https://dispatchtickets.com/docs" target="_blank" rel="noopener noreferrer">
                        View Docs <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                {/* Email Support */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Mail className="h-4 w-4" />
                      Email Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href="mailto:support@dispatchtickets.com">
                        Contact Us <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                {/* Feature Requests */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-4 w-4" />
                      Feature Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href="/feature-requests">View Requests</a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Support" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header with user info and new ticket button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Get Help</h2>
              {portalToken && (
                <p className="text-sm text-muted-foreground">
                  Logged in as {portalToken.email}
                </p>
              )}
            </div>

            {view === 'list' && (
              <Button onClick={() => setView('new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            )}
          </div>

          {/* Content */}
          <Card>
            <CardContent className="p-6">
              {view === 'list' && (
                <SupportTicketList onSelectTicket={handleSelectTicket} />
              )}

              {view === 'detail' && selectedTicketId && (
                <SupportTicketDetail
                  ticketId={selectedTicketId}
                  onBack={handleBack}
                />
              )}

              {view === 'new' && (
                <NewSupportTicketForm
                  onSuccess={handleTicketCreated}
                  onCancel={handleBack}
                />
              )}
            </CardContent>
          </Card>

          {/* Documentation link */}
          <div className="text-center mt-6 text-sm text-muted-foreground">
            Looking for documentation?{' '}
            <a
              href="https://dispatchtickets.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View the docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
