'use client';

import { useState } from 'react';
import { Header } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupportPortal, SupportTicket } from '@/lib/hooks/use-support-portal';
import { SupportTicketList, SupportTicketDetail, NewSupportTicketForm } from '@/components/support';
import { Plus, AlertCircle, Book, ExternalLink } from 'lucide-react';

type View = 'list' | 'detail' | 'new';

export default function SupportPage() {
  const { loading, error, portalToken } = useSupportPortal();
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
        <div className="flex-1 p-6">
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

  // Error state - show fallback support options
  if (error) {
    return (
      <div className="flex flex-col">
        <Header title="Support" />
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-lg font-semibold mb-2">Support portal unavailable</h2>
                  <p className="text-muted-foreground mb-6">
                    {error}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" asChild>
                      <a href="https://dispatchtickets.com/docs" target="_blank" rel="noopener noreferrer">
                        <Book className="h-4 w-4 mr-2" />
                        View Documentation
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="mailto:support@dispatchtickets.com">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Email Support
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Support" />
      <div className="flex-1 p-6">
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
