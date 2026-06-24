'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { useSubscription, usePlans, useCancelSubscription, useReactivateSubscription, useUpgradeSubscription, useUsage, useDeleteAccount, useConfirmCheckout, useCancelPendingChange, useListPaymentMethods, useAddCard, useSetDefaultCard, useRemoveCard } from '@/lib/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plan, EmbedPayload } from '@/lib/api/billing';
import { InvoiceHistoryCard } from '@/components/billing/invoice-history-card';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import { ThrottleCheckout } from '@usethrottle/checkout-sdk';

// Plan group types
interface PlanGroup {
  baseName: string;
  monthly: Plan | null;
  annual: Plan | null;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const isOwner = session?.orgRole === 'owner';
  const { data: subscriptionData, isLoading: subscriptionLoading, error: subscriptionError, refetch } = useSubscription();
  const { data: plansData, isLoading: plansLoading } = usePlans();
  const { data: usageData, isLoading: usageLoading, refetch: refetchUsage } = useUsage();

  // Handle upgrade success URL param
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      // Force refetch subscription data
      refetch().then(() => {
        toast.success('Subscription updated successfully');
      });
      // Clean up URL
      router.replace('/billing', { scroll: false });
    }
  }, [searchParams, refetch, router]);

  const cancelSubscription = useCancelSubscription();
  const reactivateSubscription = useReactivateSubscription();
  const cancelPendingChange = useCancelPendingChange();
  const upgradeSubscription = useUpgradeSubscription();
  const confirmCheckout = useConfirmCheckout();
  const deleteAccount = useDeleteAccount();
  const { data: savedCards = [] } = useListPaymentMethods();
  const addCard = useAddCard();
  const setDefault = useSetDefaultCard();
  const removeCard = useRemoveCard();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ plan: Plan; kind: 'upgrade' | 'downgrade' } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  // Embed checkout state (Throttle provider only)
  const [embedPayload, setEmbedPayload] = useState<EmbedPayload | null>(null);
  const [embedPlanRef, setEmbedPlanRef] = useState<string | null>(null);
  const [embedError, setEmbedError] = useState<string | null>(null);
  // 'subscribe' = plan upgrade flow; 'add-card' = vault-only add card
  const [embedMode, setEmbedMode] = useState<'subscribe' | 'add-card'>('subscribe');

  const subscription = subscriptionData?.subscription;
  const allPlans = plansData?.plans || [];

  // Group plans by base name (Starter, Pro, Enterprise) - excludes Free plan
  const planGroups = useMemo(() => {
    const groups: Record<string, PlanGroup> = {};

    allPlans.forEach((plan) => {
      // Skip free plan from the upgrade grid - it shows in Current Plan section
      if (plan.price === 0) return;

      // Extract base name (remove "Monthly"/"Annual" suffix, parenthesized or not:
      // handles both "Pro Annual" and "Pro (Annual)" so it maps to planDetails keys).
      const baseName = plan.name.replace(/\s*\(?(?:Monthly|Annual)\)?$/i, '');

      if (!groups[baseName]) {
        groups[baseName] = { baseName, monthly: null, annual: null };
      }

      if (plan.interval === 'month') {
        groups[baseName].monthly = plan;
      } else if (plan.interval === 'year') {
        groups[baseName].annual = plan;
      }
    });

    // Sort by price (using monthly price as reference)
    return Object.values(groups).sort((a, b) => {
      const priceA = a.monthly?.price || 0;
      const priceB = b.monthly?.price || 0;
      return priceA - priceB;
    });
  }, [allPlans]);

  const currentPlan = subscription ? allPlans.find(p => p.id === subscription.planId) : null;

  const handleCancel = async () => {
    try {
      const result = await cancelSubscription.mutateAsync({});
      toast.success(result.message);
      setCancelDialogOpen(false);
    } catch {
      toast.error('Failed to cancel subscription');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    try {
      const result = await deleteAccount.mutateAsync({ confirmation: 'DELETE' });
      toast.success(result.message);
      setDeleteDialogOpen(false);
      // Redirect to login page after account deletion
      window.location.href = '/login';
    } catch {
      toast.error('Failed to delete account');
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateSubscription.mutateAsync();
      setReactivateDialogOpen(false);
      toast.success('Subscription reactivated — it will keep renewing and won’t be cancelled.');
    } catch {
      toast.error('Failed to reactivate subscription');
    }
  };

  const handleCancelPendingChange = async () => {
    try {
      await cancelPendingChange.mutateAsync();
      toast.success('Scheduled plan change cancelled — you’ll keep your current plan.');
    } catch {
      toast.error('Failed to cancel the scheduled plan change');
    }
  };

  const handleAddCard = async () => {
    try {
      const payload = await addCard.mutateAsync();
      setEmbedPayload(payload);
      setEmbedPlanRef(null);
      setEmbedError(null);
      setEmbedMode('add-card');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message
        || (error instanceof Error ? error.message : 'Failed to start card setup');
      toast.error(message);
    }
  };

  const handleRemoveCard = (id: string) => {
    removeCard.mutate(id, {
      onError: (error: unknown) => {
        const axiosError = error as { response?: { data?: { message?: string } } };
        const message = axiosError.response?.data?.message
          || (error instanceof Error ? error.message : 'Failed to remove card');
        toast.error(message);
      },
    });
  };

  const handleUpgrade = async (planId: string, planRef?: string) => {
    setUpgradingPlanId(planId);
    try {
      const result = await upgradeSubscription.mutateAsync({
        planId,
        successUrl: `${window.location.origin}/billing?upgraded=true`,
        cancelUrl: `${window.location.origin}/billing`,
      });
      if ('embedToken' in result) {
        // Embed mode (Throttle provider): show the in-page checkout
        setEmbedPayload(result as EmbedPayload);
        setEmbedPlanRef(planRef ?? planId);
        setEmbedError(null);
        setEmbedMode('subscribe');
        setUpgradingPlanId(null);
      } else {
        // Redirect mode (Stackbe default): navigate to checkout URL
        window.location.href = result.url;
      }
    } catch (error: unknown) {
      console.error('Upgrade error:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message
        || (error instanceof Error ? error.message : 'Unknown error');
      toast.error(`Upgrade failed: ${message}`);
      setUpgradingPlanId(null);
    }
  };

  const formatPrice = (price: number | null | undefined, currency: string, interval: string) => {
    if (!price && price !== 0) return 'Not available';

    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'USD',
      minimumFractionDigits: 0,
    }).format(price / 100);

    if (interval === 'year') {
      const monthly = Math.round(price / 12);
      const monthlyFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency?.toUpperCase() || 'USD',
        minimumFractionDigits: 0,
      }).format(monthly / 100);
      return `${monthlyFormatted}/mo`;
    }

    return `${formatted}/${interval || 'month'}`;
  };

  const formatAnnualTotal = (price: number, currency: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'USD',
      minimumFractionDigits: 0,
    }).format(price / 100);
    return `${formatted}/year`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    // Check for invalid date or Unix epoch (indicates null/undefined from API)
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
      return 'Not available';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="destructive">Cancelling</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Plan feature mapping based on plan name
  const planDetails: Record<string, { tickets: string; support: string; sla?: string }> = {
    'Free': { tickets: '100 tickets/mo', support: 'Community support' },
    'Starter': { tickets: '1,000 tickets/mo', support: 'Email support' },
    'Pro': { tickets: '10,000 tickets/mo', support: 'Priority support' },
    'Enterprise': { tickets: '100,000 tickets/mo', support: 'Dedicated support', sla: '99.9% SLA' },
  };

  const getPlanFeatures = (plan: Plan, baseName: string) => {
    const features: string[] = [];
    const entitlements = plan.entitlements as Record<string, number | boolean>;
    const details = planDetails[baseName] || planDetails['Starter'];

    // Tickets per month
    features.push(details.tickets);

    // Brands limit
    if (entitlements.brands_limit === -1) {
      features.push('Unlimited brands');
    } else if (typeof entitlements.brands_limit === 'number') {
      features.push(`${entitlements.brands_limit} brand${entitlements.brands_limit === 1 ? '' : 's'}`);
    }

    // Custom domain
    if (entitlements.custom_domain) {
      features.push('Custom email domains');
    }

    // Recurring tickets (all paid plans)
    if (baseName !== 'Free') {
      features.push('Recurring tickets');
    }

    // Support level
    features.push(details.support);

    // SLA (Enterprise only)
    if (details.sla) {
      features.push(details.sla);
    }

    return features;
  };

  const isCurrentPlan = (plan: Plan) => {
    return subscription?.planId === plan.id;
  };

  const isUpgrade = (plan: Plan) => {
    if (!subscription) return true;
    return plan.price > subscription.planPrice;
  };

  // Check if downgrade is allowed based on current usage vs target plan limits
  const getDowngradeBlockReason = (plan: Plan): string | null => {
    if (!usageData) return null;

    const entitlements = plan.entitlements as Record<string, number | boolean>;
    const targetBrandLimit = entitlements.brands_limit;

    // Check brand limit (-1 means unlimited)
    if (typeof targetBrandLimit === 'number' && targetBrandLimit !== -1) {
      if (usageData.brandCount > targetBrandLimit) {
        return `You have ${usageData.brandCount} brands but this plan only allows ${targetBrandLimit}. Please delete ${usageData.brandCount - targetBrandLimit} brand${usageData.brandCount - targetBrandLimit > 1 ? 's' : ''} first.`;
      }
    }

    return null;
  };

  function requestPlanChange(plan: Plan) {
    const kind = isUpgrade(plan) ? 'upgrade' : 'downgrade';
    if (kind === 'downgrade') {
      const blocked = getDowngradeBlockReason(plan);
      if (blocked) { toast.error(blocked); return; }
    }
    setConfirmTarget({ plan, kind });
  }

  async function confirmPlanChange() {
    if (!confirmTarget) return;
    const { plan } = confirmTarget;
    setConfirmTarget(null);
    await handleUpgrade(plan.id, plan.slug);
  }

  // Calculate savings for annual plans
  const getAnnualSavings = (group: PlanGroup): number | null => {
    if (!group.monthly || !group.annual) return null;
    const monthlyYearlyTotal = group.monthly.price * 12;
    const annualPrice = group.annual.price;
    const savings = Math.round(((monthlyYearlyTotal - annualPrice) / monthlyYearlyTotal) * 100);
    return savings > 0 ? savings : null;
  };

  return (
    <div className="flex flex-col">
      <Header title="Billing" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Billing & Subscription</h2>
          <p className="text-muted-foreground">
            Manage your subscription and billing details
          </p>
        </div>

        {subscriptionLoading && (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>
        )}

        {subscriptionError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Failed to load subscription info. Please try again.
              </p>
            </CardContent>
          </Card>
        )}

        {!subscriptionLoading && !subscriptionError && (
          <div className="space-y-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>Current Plan</CardTitle>
                    {subscription && getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {subscription ? (
                  <div className="space-y-6">
                    {/* Scheduled (deferred) plan change banner */}
                    {subscription.pendingPlanName && (
                      <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-amber-900 dark:text-amber-200">
                          Your plan changes to <span className="font-semibold">{subscription.pendingPlanName}</span>
                          {subscription.pendingEffectiveAt ? ` on ${formatDate(subscription.pendingEffectiveAt)}` : ''}.
                          You keep your current plan until then.
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

                    <div className="flex items-baseline gap-4">
                      <h3 className="text-3xl font-bold">{subscription.planName}</h3>
                      <span className="text-xl text-muted-foreground">
                        {formatPrice(subscription.planPrice, subscription.planCurrency, subscription.planInterval)}
                        {subscription.planInterval === 'year' && (
                          <span className="text-sm ml-1">
                            ({formatAnnualTotal(subscription.planPrice, subscription.planCurrency)})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Plan Entitlements */}
                    {currentPlan && (
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm py-3 border-y">
                        {getPlanFeatures(currentPlan, subscription.planName.replace(/\s*\(?(?:Monthly|Annual)\)?$/i, '')).map((feature, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-muted-foreground">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-6 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Billing Cycle</p>
                        <p className="font-medium capitalize">{subscription.planInterval === 'year' ? 'Annual' : 'Monthly'}</p>
                      </div>
                      {subscription.currentPeriodEnd && (
                        <div>
                          <p className="text-muted-foreground mb-1">
                            {subscription.cancelAtPeriodEnd ? 'Access Ends On' : 'Next Charge'}
                          </p>
                          <p className="font-medium">
                            {subscription.cancelAtPeriodEnd
                              ? formatDate(subscription.currentPeriodEnd)
                              : `${
                                  subscription.planInterval === 'year'
                                    ? formatAnnualTotal(subscription.planPrice, subscription.planCurrency)
                                    : formatPrice(subscription.planPrice, subscription.planCurrency, subscription.planInterval)
                                } on ${formatDate(subscription.currentPeriodEnd)}`}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {subscription.cancelAtPeriodEnd ? (
                        <Button
                          onClick={() => setReactivateDialogOpen(true)}
                          disabled={reactivateSubscription.isPending}
                        >
                          {reactivateSubscription.isPending ? 'Reactivating...' : 'Reactivate Subscription'}
                        </Button>
                      ) : (
                        <button
                          onClick={() => setCancelDialogOpen(true)}
                          className="text-sm text-muted-foreground hover:text-destructive hover:underline"
                        >
                          Cancel Subscription
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-lg font-medium">No active subscription</p>
                    <p className="text-muted-foreground mt-1">
                      Choose a plan below to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment methods */}
            <Card>
              <CardHeader><CardTitle>Payment methods</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {savedCards.length === 0 && (
                  <p className="text-sm text-muted-foreground">No saved cards.</p>
                )}
                {savedCards.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono">
                      {c.brand?.toUpperCase()} •••• {c.last4} · {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(-2)}
                    </span>
                    <span className="flex items-center gap-3">
                      {c.isDefault ? (
                        <Badge>Default</Badge>
                      ) : (
                        <button
                          className="text-xs underline"
                          onClick={() => setDefault.mutate(c.id)}
                          disabled={setDefault.isPending}
                        >
                          Make default
                        </button>
                      )}
                      {!c.isDefault && (
                        <button
                          className="text-xs text-destructive underline"
                          onClick={() => handleRemoveCard(c.id)}
                          disabled={removeCard.isPending}
                        >
                          Remove
                        </button>
                      )}
                    </span>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCard}
                  disabled={addCard.isPending}
                >
                  {addCard.isPending ? 'Opening...' : '+ Add card'}
                </Button>
              </CardContent>
            </Card>

            {/* Available Plans */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{subscription ? 'Change Your Plan' : 'Available Plans'}</CardTitle>
                    <CardDescription>
                      {!subscription
                        ? 'Choose a plan to get started'
                        : subscription.cancelAtPeriodEnd
                          ? 'Plan changes are paused while your cancellation is pending — reactivate to switch plans.'
                          : 'Switch tiers anytime — your current plan is highlighted. To stop paying, use Cancel Subscription above.'}
                    </CardDescription>
                  </div>
                  {/* Billing Period Toggle */}
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium transition-colors ${billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      Monthly
                    </span>
                    <button
                      onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                      className="relative h-6 w-11 rounded-full bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      role="switch"
                      aria-checked={billingPeriod === 'annual'}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-primary shadow-sm transition-transform duration-200 ${
                          billingPeriod === 'annual' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-medium transition-colors ${billingPeriod === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
                        Annual
                      </span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        Save up to 34%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-64 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3 items-stretch">
                    {planGroups.map((group) => {
                      const plan = billingPeriod === 'annual' ? group.annual : group.monthly;
                      if (!plan) return null;

                      const savings = getAnnualSavings(group);
                      const isCurrent = isCurrentPlan(plan);
                      const isUpgradeAction = isUpgrade(plan);

                      return (
                        <div
                          key={group.baseName}
                          className={`relative rounded-lg border p-4 flex flex-col ${
                            isCurrent ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          {isCurrent && (
                            <Badge className="absolute -top-2 right-2 bg-primary">
                              Current
                            </Badge>
                          )}
                          {billingPeriod === 'annual' && savings && !isCurrent && (
                            <Badge className="absolute -top-2 left-2 bg-green-600">
                              Save {savings}%
                            </Badge>
                          )}
                          <div className="mb-4">
                            <h3 className="font-semibold">{group.baseName}</h3>
                            <p className="text-2xl font-bold mt-1">
                              {formatPrice(plan.price, plan.currency, plan.interval)}
                            </p>
                            {billingPeriod === 'annual' && (
                              <p className="text-sm text-muted-foreground">
                                {formatAnnualTotal(plan.price, plan.currency)}
                              </p>
                            )}
                          </div>
                          <ul className="space-y-2 text-sm text-muted-foreground mb-4 flex-1">
                            {getPlanFeatures(plan, group.baseName).map((feature, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {feature}
                              </li>
                            ))}
                            {/* Overage pricing */}
                            <li className="flex items-center gap-2 pt-2 border-t">
                              <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              <span>$0.02/ticket overage</span>
                            </li>
                          </ul>
                          {!isCurrent && (
                            <Button
                              className="w-full"
                              variant={isUpgradeAction ? 'default' : 'outline'}
                              onClick={() => requestPlanChange(plan)}
                              disabled={upgradingPlanId !== null || subscription?.cancelAtPeriodEnd || (!isUpgradeAction && !!getDowngradeBlockReason(plan))}
                              title={subscription?.cancelAtPeriodEnd ? 'Reactivate your subscription to change plans' : (!isUpgradeAction ? getDowngradeBlockReason(plan) || undefined : undefined)}
                            >
                              {upgradingPlanId === plan.id
                                ? 'Processing...'
                                : isUpgradeAction
                                ? 'Upgrade'
                                : 'Downgrade'}
                            </Button>
                          )}
                          {isCurrent && (
                            <Button className="w-full" variant="outline" disabled>
                              Current Plan
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Usage</CardTitle>
                <CardDescription>
                  Your usage for the current billing period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usageLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ) : usageData ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold">
                        {usageData.ticketCount.toLocaleString()}
                        {usageData.planLimit && (
                          <span className="text-lg font-normal text-muted-foreground">
                            {' '}/ {usageData.planLimit.toLocaleString()}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        tickets this billing period
                      </p>
                    </div>
                    {usageData.planLimit && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            usageData.ticketCount >= usageData.planLimit
                              ? 'bg-destructive'
                              : usageData.ticketCount >= usageData.planLimit * 0.8
                              ? 'bg-yellow-500'
                              : 'bg-primary'
                          }`}
                          style={{
                            width: `${Math.min(100, (usageData.ticketCount / usageData.planLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                    {usageData.ticketCount > (usageData.planLimit || 0) && usageData.planLimit && (
                      <p className="text-sm text-amber-600">
                        You&apos;re {usageData.ticketCount - usageData.planLimit} tickets over your limit.
                        Overage charges: ${((usageData.ticketCount - usageData.planLimit) * 0.02).toFixed(2)}
                      </p>
                    )}
                    {subscription?.currentPeriodEnd && (
                      <p className="text-xs text-muted-foreground">
                        Period resets: {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No usage data available.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Invoice History — powered by @usethrottle/invoices via the
                /api/throttle server proxy (customer-scoped, secret key stays
                server-side). */}
            <InvoiceHistoryCard />

            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </div>
                <CardDescription>
                  Irreversible actions that affect your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                  <div>
                    <h4 className="font-medium">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data including brands, tickets, and settings.
                    </p>
                    {!isOwner && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Only account owners can delete the account.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={!isOwner}
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Embed Checkout Modal (Throttle provider only) */}
      <Dialog
        open={!!embedPayload}
        onOpenChange={(open) => {
          if (!open) {
            setEmbedPayload(null);
            setEmbedPlanRef(null);
            setEmbedError(null);
            setEmbedMode('subscribe');
            setUpgradingPlanId(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          {embedError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              {embedError}
            </div>
          )}
          {embedPayload && (
            <ThrottleCheckout
              sessionId={embedPayload.checkoutSessionId}
              parentOrigin={window.location.origin}
              onSucceeded={async () => {
                if (embedMode === 'add-card') {
                  setEmbedPayload(null);
                  setEmbedPlanRef(null);
                  setEmbedError(null);
                  queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
                  toast.success('Card added successfully');
                  return;
                }
                try {
                  await confirmCheckout.mutateAsync({
                    checkoutSessionId: embedPayload.checkoutSessionId,
                    planRef: embedPlanRef ?? undefined,
                  });
                  setEmbedPayload(null);
                  setEmbedPlanRef(null);
                  setEmbedError(null);
                  toast.success('Subscription activated');
                  // Await both refetches so the Current Plan + Usage update
                  // immediately after payment (no manual reload needed).
                  await Promise.all([refetch(), refetchUsage()]);
                } catch (err: unknown) {
                  const axiosError = err as { response?: { data?: { message?: string } } };
                  const msg = axiosError.response?.data?.message
                    || (err instanceof Error ? err.message : 'Failed to confirm subscription');
                  setEmbedError(msg);
                }
              }}
              onFailed={({ message }) => {
                setEmbedError(message || 'Payment failed. Please try again.');
              }}
              onCancelled={() => {
                setEmbedPayload(null);
                setEmbedPlanRef(null);
                setEmbedError(null);
                setEmbedMode('subscribe');
                setUpgradingPlanId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll keep full access until
              {subscription?.currentPeriodEnd ? ` ${formatDate(subscription.currentPeriodEnd)}` : ' the end of your current billing period'}.
              After that your plan reverts to <strong>Free</strong> and you won&apos;t be charged again.
              You can reactivate anytime before then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelSubscription.isPending ? 'Cancelling...' : 'Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Subscription Dialog */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Your {subscription?.planName ?? 'subscription'} will continue as normal and keep
              renewing
              {subscription?.currentPeriodEnd ? ` on ${formatDate(subscription.currentPeriodEnd)}` : ''}
              {' '}instead of cancelling. You can cancel again anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Cancelling</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={reactivateSubscription.isPending}
            >
              {reactivateSubscription.isPending ? 'Reactivating...' : 'Reactivate Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unified Plan Change Confirm Dialog */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.kind === 'upgrade' ? `Upgrade to ${confirmTarget?.plan.name}?` : `Switch to ${confirmTarget?.plan.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.kind === 'upgrade'
                ? `You'll be charged ${formatPrice(confirmTarget.plan.price, confirmTarget.plan.currency, confirmTarget.plan.interval)} today and your billing period restarts now.`
                : `No charge now. You keep ${subscription?.planName} until ${subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'period end'}, then switch to ${confirmTarget?.plan.name}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPlanChange}>
              {confirmTarget?.kind === 'upgrade'
                ? `Pay ${formatPrice(confirmTarget.plan.price, confirmTarget.plan.currency, confirmTarget.plan.interval)} & upgrade`
                : 'Schedule downgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) setDeleteConfirmation('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action <strong>cannot be undone</strong>. This will permanently delete your account
                and remove all associated data including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All brands and their settings</li>
                <li>All tickets and comments</li>
                <li>All attachments and files</li>
                <li>All team members and permissions</li>
                <li>Your subscription will be cancelled</li>
              </ul>
              <p className="pt-2">
                Please type <strong>DELETE</strong> to confirm:
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              placeholder="Type DELETE to confirm"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE' || deleteAccount.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
