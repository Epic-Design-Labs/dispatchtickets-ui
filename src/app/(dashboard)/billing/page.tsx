'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { ThrottleCheckout } from '@usethrottle/checkout-sdk';
import {
  useCancelPendingChange,
  useCancelSubscription,
  useConfirmCheckout,
  usePlans,
  useReactivateSubscription,
  useSubscription,
  useUpgradeSubscription,
  useUsage,
} from '@/lib/hooks';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pill } from '@/components/tickets/pill';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { EmbedPayload, Plan, Subscription } from '@/lib/api/billing';
import { InvoiceHistoryCard } from '@/components/billing/invoice-history-card';
import { PaymentMethodsWallet } from '@/components/billing/payment-methods-wallet';
import { ChangePlanDialog } from '@/components/billing/change-plan-dialog';
import {
  formatLongDate,
  planBaseName,
  planFeatures,
  priceLine,
} from '@/components/billing/plan-helpers';

/** Overage on paid plans: $20 per 1,000 tickets. */
const OVERAGE_CENTS_PER_TICKET = 2;

/**
 * Cancelling and Past Due must not look alike: one is a change the customer
 * scheduled and can undo with the button beside it, the other is a failed
 * payment that ends the service if ignored. Red belongs to Past Due alone.
 */
function StatusPill({ subscription }: { subscription: Subscription }) {
  if (subscription.cancelAtPeriodEnd) {
    return <Pill className="bg-warning-soft text-warning-foreground">Cancelling</Pill>;
  }
  switch (subscription.status) {
    case 'active':
      return <Pill className="bg-success-soft text-success-foreground">Active</Pill>;
    case 'trialing':
      return <Pill className="bg-info-soft text-info">Trial</Pill>;
    case 'past_due':
      return <Pill className="bg-danger-soft text-danger">Past due</Pill>;
    case 'canceled':
    case 'cancelled':
      return <Pill className="bg-secondary text-muted-foreground">Cancelled</Pill>;
    case 'paused':
      return <Pill className="bg-secondary text-muted-foreground">Paused</Pill>;
    default:
      return <Pill className="bg-secondary text-muted-foreground">{subscription.status}</Pill>;
  }
}

function UsageMeter({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  /** null or -1 = unlimited */
  limit: number | null;
  unit: string;
}) {
  const unlimited = limit === null || limit === -1;
  const pct = unlimited || limit === 0 ? 0 : (used / limit) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {unlimited
            ? `${used.toLocaleString()} ${unit} · unlimited`
            : `${used.toLocaleString()} of ${limit.toLocaleString()}`}
        </span>
      </div>
      {!unlimited && (
        <div
          className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={used}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width]',
              pct >= 100 ? 'bg-danger' : pct >= 90 ? 'bg-warning' : 'bg-brand',
            )}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const isOwner = session?.orgRole === 'owner';
  const {
    data: subscriptionData,
    isLoading: subscriptionLoading,
    error: subscriptionError,
    refetch,
  } = useSubscription();
  const { data: plansData, isLoading: plansLoading } = usePlans();
  const { data: usage, isLoading: usageLoading, refetch: refetchUsage } = useUsage();

  // Return from a redirect checkout.
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      refetch().then(() => toast.success('Subscription updated'));
      router.replace('/billing', { scroll: false });
    }
  }, [searchParams, refetch, router]);

  const cancelSubscription = useCancelSubscription();
  const reactivateSubscription = useReactivateSubscription();
  const cancelPendingChange = useCancelPendingChange();
  const upgradeSubscription = useUpgradeSubscription();
  const confirmCheckout = useConfirmCheckout();

  // Captured once: comparing against Date.now() during render is impure.
  const [loadedAt] = useState(() => Date.now());
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeKey, setChangeKey] = useState(0);
  const openChangePlan = () => {
    setChangeKey((k) => k + 1);
    setChangeOpen(true);
  };
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ plan: Plan; kind: 'upgrade' | 'downgrade' } | null>(null);
  const [changing, setChanging] = useState(false);
  // Embed checkout (Throttle provider only)
  const [embedPayload, setEmbedPayload] = useState<EmbedPayload | null>(null);
  const [embedPlanRef, setEmbedPlanRef] = useState<string | null>(null);
  const [embedError, setEmbedError] = useState<string | null>(null);

  const subscription = subscriptionData?.subscription ?? null;
  const allPlans = plansData?.plans ?? [];
  const currentPlan = subscription ? allPlans.find((p) => p.id === subscription.planId) : undefined;
  const isFree = !subscription || subscription.planPrice === 0;
  const periodEnd = formatLongDate(subscription?.currentPeriodEnd);
  // The API spells it both ways depending on the provider.
  const isEnded = subscription?.status === 'canceled' || subscription?.status === 'cancelled';
  const periodPast =
    !!subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd).getTime() < loadedAt;
  const canCancel = !!subscription && !subscription.cancelAtPeriodEnd && !isFree && !isEnded;
  const pendingOn = formatLongDate(subscription?.pendingEffectiveAt);

  const closeEmbed = () => {
    setEmbedPayload(null);
    setEmbedPlanRef(null);
    setEmbedError(null);
    setChanging(false);
  };

  const handleCancel = async () => {
    try {
      const result = await cancelSubscription.mutateAsync({});
      toast.success(result.message);
      setCancelDialogOpen(false);
    } catch {
      toast.error('Could not cancel the subscription');
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateSubscription.mutateAsync();
      setReactivateDialogOpen(false);
      toast.success('Subscription reactivated. It will keep renewing.');
    } catch {
      toast.error('Could not reactivate the subscription');
    }
  };

  const handleCancelPendingChange = async () => {
    try {
      await cancelPendingChange.mutateAsync();
      toast.success('Scheduled change cancelled. You keep your current plan.');
    } catch {
      toast.error('Could not cancel the scheduled change');
    }
  };

  const startCheckout = async (plan: Plan) => {
    setChanging(true);
    try {
      const result = await upgradeSubscription.mutateAsync({
        planId: plan.id,
        successUrl: `${window.location.origin}/billing?upgraded=true`,
        cancelUrl: `${window.location.origin}/billing`,
      });
      if ('embedToken' in result) {
        setEmbedPayload(result as EmbedPayload);
        setEmbedPlanRef(plan.slug ?? plan.id);
        setEmbedError(null);
        setChanging(false);
      } else {
        window.location.href = result.url;
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        (error instanceof Error ? error.message : 'Unknown error');
      toast.error(`Plan change failed: ${message}`);
      setChanging(false);
    }
  };

  // Downgrade guard: the target plan must fit the brands you already have.
  const blockReason = (plan: Plan): string | null => {
    if (!usage) return null;
    const limit = (plan.entitlements as Record<string, unknown>).brands_limit;
    if (typeof limit !== 'number' || limit === -1 || usage.brandCount <= limit) return null;
    const extra = usage.brandCount - limit;
    return `You have ${usage.brandCount} brands and this plan allows ${limit}. Delete ${extra} brand${extra === 1 ? '' : 's'} first.`;
  };

  const ticketLimit = usage?.planLimit ?? null;
  const unlimitedTickets = ticketLimit === null || ticketLimit === -1;
  const ticketsOver = !unlimitedTickets && usage ? usage.ticketCount - ticketLimit : 0;
  const ticketPct = !unlimitedTickets && usage && ticketLimit > 0 ? (usage.ticketCount / ticketLimit) * 100 : 0;
  const brandLimit = usage?.brandLimit ?? null;
  const brandsFull = !!usage && brandLimit !== null && brandLimit !== -1 && usage.brandCount >= brandLimit;

  const intervalWord = subscription?.planInterval === 'year' ? 'annually' : 'monthly';

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plan and billing</h1>
        <p className="text-muted-foreground">
          {subscription && !isFree && !isEnded ? `Billed ${intervalWord}. ` : ''}
          Spam tickets don&apos;t count toward your limit.
        </p>
      </div>

      {subscriptionLoading ? (
        <div className="bg-card space-y-4 rounded-xl border p-5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
      ) : subscriptionError ? (
        <div className="bg-card text-destructive rounded-xl border p-5 text-sm">
          Couldn&apos;t load your plan. Refresh the page to try again.
        </div>
      ) : (
        <>
          {/* Current plan */}
          <section className="bg-card rounded-xl border">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Current plan
                  </span>
                  {subscription && <StatusPill subscription={subscription} />}
                </div>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">
                  {subscription ? planBaseName(subscription.planName) : 'Free'}
                </h2>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {!subscription || subscription.planPrice === 0
                    ? 'No card needed.'
                    : `${priceLine(subscription.planPrice, subscription.planCurrency, subscription.planInterval)}${
                        !periodEnd
                          ? ''
                          : isEnded || periodPast
                            ? ` · period ended ${periodEnd}`
                            : subscription.cancelAtPeriodEnd
                              ? ` · access ends ${periodEnd}`
                              : ` · renews ${periodEnd}`
                      }`}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {subscription?.cancelAtPeriodEnd ? (
                  <Button onClick={() => setReactivateDialogOpen(true)} disabled={reactivateSubscription.isPending}>
                    Reactivate
                  </Button>
                ) : (
                  <Button onClick={openChangePlan} disabled={changing}>
                    {changing ? 'Opening checkout…' : isFree ? 'Upgrade' : 'Change plan'}
                  </Button>
                )}
              </div>
            </div>

            {subscription?.pendingPlanName && (
              <div className="border-warning/25 bg-warning-soft mx-5 mb-4 flex flex-col gap-3 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-warning-foreground">
                  Your plan changes to <span className="font-semibold">{subscription.pendingPlanName}</span>
                  {pendingOn ? ` on ${pendingOn}` : ''}. You keep your current plan until then.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleCancelPendingChange}
                  disabled={cancelPendingChange.isPending}
                >
                  {cancelPendingChange.isPending ? 'Cancelling…' : 'Keep my current plan'}
                </Button>
              </div>
            )}

            {subscription?.cancelAtPeriodEnd && (
              <p className="text-muted-foreground mx-5 mb-4 text-sm">
                Your subscription is cancelled. After {periodEnd ?? 'this period'} the account moves to Free.
                Reactivate to keep it, or to change plans.
              </p>
            )}

            <div className="space-y-4 border-t p-5">
              {usageLoading ? (
                <>
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </>
              ) : usage ? (
                <>
                  <UsageMeter label="Tickets this period" used={usage.ticketCount} limit={ticketLimit} unit="tickets" />
                  <UsageMeter label="Brands" used={usage.brandCount} limit={brandLimit} unit="brands" />

                  {ticketsOver > 0 ? (
                    isFree ? (
                      <p className="bg-danger-soft text-danger rounded-lg px-3 py-2 text-sm">
                        You&apos;ve used all {ticketLimit?.toLocaleString()} tickets on Free. New tickets through
                        the API are refused until the period resets. Upgrade to keep going.
                      </p>
                    ) : (
                      <p className="bg-warning-soft text-warning-foreground rounded-lg px-3 py-2 text-sm">
                        {ticketsOver.toLocaleString()} ticket{ticketsOver === 1 ? '' : 's'} over your limit,
                        billed at $20 per 1,000 (about $
                        {((ticketsOver * OVERAGE_CENTS_PER_TICKET) / 100).toFixed(2)} so far).
                      </p>
                    )
                  ) : ticketPct >= 90 ? (
                    <p className="bg-warning-soft text-warning-foreground rounded-lg px-3 py-2 text-sm">
                      You&apos;ve used {Math.floor(ticketPct)}% of this period&apos;s tickets.{' '}
                      {isFree
                        ? 'Free stops accepting API tickets at the limit.'
                        : 'Tickets past the limit cost $20 per 1,000.'}
                    </p>
                  ) : brandsFull ? (
                    <p className="text-muted-foreground text-sm">
                      You&apos;re using every brand your plan includes. Pro and above have unlimited brands.
                    </p>
                  ) : null}

                  {periodEnd && !subscription?.cancelAtPeriodEnd && !isEnded && !periodPast && (
                    <p className="text-muted-foreground text-xs">Ticket count resets {periodEnd}.</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Usage isn&apos;t available right now.</p>
              )}
            </div>

            {(currentPlan || canCancel) && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
                <p className="text-muted-foreground text-xs">
                  {currentPlan ? planFeatures(currentPlan).join(' · ') : ''}
                </p>
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setCancelDialogOpen(true)}
                    className="text-muted-foreground hover:text-destructive text-xs hover:underline"
                  >
                    Cancel subscription
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Payment method */}
          <section className="bg-card rounded-xl border">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold">Payment method</h2>
              <p className="text-muted-foreground text-sm">The card we charge for your plan and any overage.</p>
            </div>
            <div className="p-5">
              <PaymentMethodsWallet />
            </div>
          </section>

          <InvoiceHistoryCard />

          {isOwner && (
            <p className="text-muted-foreground text-sm">
              To delete the workspace, go to{' '}
              <Link href="/workspace" className="text-foreground underline">
                Workspace settings
              </Link>
              .
            </p>
          )}
        </>
      )}

      <ChangePlanDialog
        key={changeKey}
        open={changeOpen}
        onOpenChange={setChangeOpen}
        plans={allPlans}
        plansLoading={plansLoading}
        subscription={subscription}
        blockReason={blockReason}
        onChoose={(plan, kind) => {
          setChangeOpen(false);
          setConfirmTarget({ plan, kind });
        }}
      />

      {/* Confirm plan change */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.kind === 'upgrade'
                ? `Upgrade to ${confirmTarget.plan.name}?`
                : `Switch to ${confirmTarget?.plan.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.kind === 'upgrade'
                ? `You'll pay ${priceLine(confirmTarget.plan.price, confirmTarget.plan.currency, confirmTarget.plan.interval)} starting today, and your billing period restarts now.`
                : `Nothing is charged now. You keep ${subscription?.planName ?? 'your plan'} until ${periodEnd ?? 'the end of this period'}, then switch to ${confirmTarget?.plan.name}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = confirmTarget;
                setConfirmTarget(null);
                if (target) void startCheckout(target.plan);
              }}
            >
              {confirmTarget?.kind === 'upgrade' ? (
                <>
                  Continue to payment
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </>
              ) : (
                'Schedule the switch'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Embed checkout (Throttle provider) */}
      <Dialog open={!!embedPayload} onOpenChange={(open) => !open && closeEmbed()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete payment</DialogTitle>
          </DialogHeader>
          {embedError && (
            <div className="border-destructive/50 bg-destructive/5 text-destructive rounded-md border p-3 text-sm">
              {embedError}
            </div>
          )}
          {embedPayload && (
            <ThrottleCheckout
              sessionId={embedPayload.checkoutSessionId}
              parentOrigin={window.location.origin}
              onSucceeded={async () => {
                try {
                  await confirmCheckout.mutateAsync({
                    checkoutSessionId: embedPayload.checkoutSessionId,
                    planRef: embedPlanRef ?? undefined,
                  });
                  closeEmbed();
                  toast.success('Subscription updated');
                  await Promise.all([refetch(), refetchUsage()]);
                } catch (err: unknown) {
                  const msg =
                    (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
                    (err instanceof Error ? err.message : 'Could not confirm the subscription');
                  setEmbedError(msg);
                }
              }}
              onFailed={({ message }) => setEmbedError(message || 'Payment failed. Please try again.')}
              onCancelled={closeEmbed}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel subscription */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You keep full access until {periodEnd ?? 'the end of this billing period'}. After that the
              account moves to <strong>Free</strong> and you won&apos;t be charged again. You can reactivate any
              time before then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleCancel();
              }}
              disabled={cancelSubscription.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {cancelSubscription.isPending ? 'Cancelling…' : 'Cancel subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              {subscription?.planName ?? 'Your plan'} carries on and renews
              {periodEnd ? ` on ${periodEnd}` : ''} instead of ending. You can cancel again any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep cancelling</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleReactivate();
              }}
              disabled={reactivateSubscription.isPending}
            >
              {reactivateSubscription.isPending ? 'Reactivating…' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
