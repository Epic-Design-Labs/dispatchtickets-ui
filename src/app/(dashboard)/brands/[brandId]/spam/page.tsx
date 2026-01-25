'use client';

import { useParams } from 'next/navigation';
import { useBrand, useTickets, useMarkAsSpam, useFieldsByEntity } from '@/lib/hooks';
import { Header } from '@/components/layout';
import { TicketTable } from '@/components/tickets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ShieldX } from 'lucide-react';

export default function SpamPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const { data: brand } = useBrand(brandId);
  const { data: ticketsData, isLoading } = useTickets(brandId, { isSpam: true });
  const markAsSpam = useMarkAsSpam(brandId);
  const { data: ticketFields } = useFieldsByEntity(brandId, 'ticket');

  const spamTickets = ticketsData?.data || [];

  const handleUnspam = async (ticketId: string) => {
    try {
      await markAsSpam.mutateAsync({ ticketId, isSpam: false });
      toast.success('Ticket restored from spam');
    } catch {
      toast.error('Failed to restore ticket');
    }
  };

  return (
    <div className="flex flex-col">
      <Header title={`${brand?.name || ''} - Spam`} />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <ShieldX className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold tracking-tight">Spam</h2>
          </div>
          <p className="text-muted-foreground">
            Tickets marked as spam are excluded from your billing. You can restore tickets if they were marked incorrectly.
          </p>
        </div>

        {spamTickets.length === 0 && !isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>No Spam</CardTitle>
              <CardDescription>
                Your spam folder is empty. Tickets marked as spam will appear here.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-4">
            <TicketTable
              tickets={spamTickets}
              brandId={brandId}
              isLoading={isLoading}
              customFields={ticketFields}
              renderActions={(ticket) => (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnspam(ticket.id);
                  }}
                  disabled={markAsSpam.isPending}
                >
                  Restore
                </Button>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
