'use client';

import dynamic from 'next/dynamic';
import { useGetPmClientToken } from '@/lib/hooks/use-billing';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

const PaymentMethods = dynamic(
  () => import('@usethrottle/payment-methods').then((m) => ({ default: m.PaymentMethods })),
  { ssr: false, loading: () => <Skeleton className="h-24 w-full" /> },
);

const THROTTLE_BASE =
  process.env.NEXT_PUBLIC_THROTTLE_API_BASE || 'https://api.usethrottle.dev';

export function PaymentMethodsWallet() {
  const { data, isLoading, error } = useGetPmClientToken();
  const queryClient = useQueryClient();

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (error || !data?.token)
    return (
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t load payment methods. Refresh to try again.
      </p>
    );

  return (
    <PaymentMethods
      clientToken={data.token}
      baseUrl={THROTTLE_BASE}
      onChange={() => queryClient.invalidateQueries({ queryKey: ['payment-methods'] })}
    />
  );
}
