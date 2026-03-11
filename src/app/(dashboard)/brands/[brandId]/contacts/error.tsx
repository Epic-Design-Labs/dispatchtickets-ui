'use client';

import { ErrorBoundary } from '@/components/error-boundary';

export default function ContactsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundary error={error} reset={reset} title="Contacts Error" />;
}
