'use client';

import { useState } from 'react';
import {
  InvoiceProvider,
  useInvoices,
  useDownloadInvoice,
  type Invoice,
  type InvoiceFetcher,
} from '@usethrottle/invoices';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Fetcher for the @usethrottle/invoices client: route every request through our
 * server proxy (/api/throttle/[...path]) and attach the DT session token so the
 * proxy can resolve the signed-in user -> their Throttle customer. The client
 * issues paths like `/api/v1/invoices`; the proxy lives at /api/throttle, so the
 * final URL is `/api/throttle/api/v1/invoices`. The secret key stays server-side.
 */
const invoiceFetcher: InvoiceFetcher = async (path, init) => {
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('dispatch_session_token');
    if (!token) {
      // Clerk-authenticated users (no Stackbe session token): fall back to the
      // Clerk JWT, mirroring the axios client's interceptor.
      try {
        const clerk = (window as unknown as {
          Clerk?: { session?: { getToken?: () => Promise<string | null> } };
        }).Clerk;
        token = (await clerk?.session?.getToken?.()) ?? null;
      } catch {
        token = null;
      }
    }
  }
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`/api/throttle${path}`, { ...init, headers });
};

function formatMoney(cents: number, currency: string): string {
  const amount = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function statusBadge(status: Invoice['status']) {
  switch (status) {
    case 'paid':
      return <Badge className="bg-green-500">Paid</Badge>;
    case 'open':
      return <Badge className="bg-yellow-500">Open</Badge>;
    case 'refunded':
      return <Badge variant="destructive">Refunded</Badge>;
    case 'partially_refunded':
      return <Badge variant="destructive">Partially refunded</Badge>;
    case 'void':
      return <Badge variant="secondary">Void</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function sourceLabel(type?: Invoice['sourceType']): string {
  switch (type) {
    case 'subscription':
      return 'Subscription';
    case 'net30':
      return 'Net 30';
    case 'order':
      return 'Order';
    default:
      return '—';
  }
}

function InvoiceList() {
  const { data, isLoading, error } = useInvoices({ limit: 20, sort: 'desc' });
  const downloadInvoice = useDownloadInvoice();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const invoices = data?.data ?? [];

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      const url = await downloadInvoice(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not download invoice. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">
          Couldn&rsquo;t load your invoices. Please try again later.
        </p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">
          No invoices yet. Your payment history will appear here.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell className="font-medium">
              {inv.number || inv.id.slice(-8)}
            </TableCell>
            <TableCell>{sourceLabel(inv.sourceType)}</TableCell>
            <TableCell>{formatDate(inv.issuedAt ?? inv.createdAt)}</TableCell>
            <TableCell>{formatMoney(inv.total, inv.currency)}</TableCell>
            <TableCell>{statusBadge(inv.status)}</TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                title="Download PDF"
                disabled={downloadingId === inv.id}
                onClick={() => handleDownload(inv.id)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Invoice History card, powered by the @usethrottle/invoices package via our
 * /api/throttle server proxy. Replaces the legacy DT getInvoices view; a
 * signed-in customer only ever sees their own invoices (the proxy scopes every
 * response to their Throttle customer).
 */
export function InvoiceHistoryCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice History</CardTitle>
        <CardDescription>Your past payments and invoices</CardDescription>
      </CardHeader>
      <CardContent>
        <InvoiceProvider fetcher={invoiceFetcher}>
          <InvoiceList />
        </InvoiceProvider>
      </CardContent>
    </Card>
  );
}
