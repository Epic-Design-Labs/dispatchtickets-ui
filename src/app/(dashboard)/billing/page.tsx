'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { useSubscription, usePlans, useCancelSubscription, useReactivateSubscription, useUpgradeSubscription, useUsage } from '@/lib/hooks';
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
import { toast } from 'sonner';
import { Plan } from '@/lib/api/billing';

export default function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: subscriptionData, isLoading: subscriptionLoading, error: subscriptionError, refetch } = useSubscription();
  const { data: plansData, isLoading: plansLoading } = usePlans();
  const { data: usageData, isLoading: usageLoading } = useUsage();

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
  const upgradeSubscription = useUpgradeSubscription();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false);
  const [selectedDowngradePlan, setSelectedDowngradePlan] = useState<Plan | null>(null);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  const subscription = subscriptionData?.subscription;
  const allPlans = plansData?.plans || [];
  // Filter out free plan from cards - it will have its own button
  const plans = allPlans.filter(p => p.price > 0);
  const freePlan = allPlans.find(p => p.price === 0);

  const handleCancel = async () => {
    try {
      const result = await cancelSubscription.mutateAsync({});
      toast.success(result.message);
      setCancelDialogOpen(false);
    } catch {
      toast.error('Failed to cancel subscription');
    }
  };

  const handleReactivate = async () => {
    try {
      const result = await reactivateSubscription.mutateAsync();
      toast.success(result.message);
    } catch {
      toast.error('Failed to reactivate subscription');
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlanId(planId);
    try {
      const result = await upgradeSubscription.mutateAsync({
        planId,
        successUrl: `${window.location.origin}/billing?upgraded=true`,
        cancelUrl: `${window.location.origin}/billing`,
      });
      // Redirect to Stripe checkout
      window.location.href = result.url;
    } catch (error: unknown) {
      console.error('Upgrade error:', error);
      // Extract message from axios error response
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message
        || (error instanceof Error ? error.message : 'Unknown error');
      toast.error(`Upgrade failed: ${message}`);
      setUpgradingPlanId(null);
    }
  };

  const formatPrice = (price: number, currency: string, interval: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price / 100);
    return `${formatted}/${interval}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  // Plan feature mapping based on plan name (tickets/support not stored in entitlements)
  const planDetails: Record<string, { tickets: string; support: string; sla?: string }> = {
    'Free': { tickets: '100 tickets/mo', support: 'Email support' },
    'Starter': { tickets: '1,000 tickets/mo', support: 'Email support' },
    'Pro': { tickets: '10,000 tickets/mo', support: 'Priority support' },
    'Enterprise': { tickets: '100,000 tickets/mo', support: 'Dedicated support', sla: '99.9% SLA' },
  };

  const getPlanFeatures = (plan: Plan) => {
    const features: string[] = [];
    const entitlements = plan.entitlements as Record<string, number | boolean>;
    const details = planDetails[plan.name] || planDetails['Free'];

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

    // Support level
    features.push(details.support);

    // SLA (Enterprise only)
    if (details.sla) {
      features.push(details.sla);
    }

    // Overage billing (paid plans only)
    if (plan.price > 0) {
      features.push('Overage billing available');
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

  const handleDowngrade = (plan: Plan) => {
    const blockReason = getDowngradeBlockReason(plan);
    if (blockReason) {
      toast.error(blockReason);
      return;
    }
    setSelectedDowngradePlan(plan);
    setDowngradeDialogOpen(true);
  };

  const confirmDowngrade = async () => {
    if (!selectedDowngradePlan) return;
    try {
      const result = await upgradeSubscription.mutateAsync({
        planId: selectedDowngradePlan.id,
        successUrl: `${window.location.origin}/billing?upgraded=true`,
        cancelUrl: `${window.location.origin}/billing`,
      });
      // For free plan, no checkout redirect - just refresh
      if (selectedDowngradePlan.price === 0) {
        toast.success('Downgraded to free plan');
        refetch();
        setDowngradeDialogOpen(false);
        setSelectedDowngradePlan(null);
      } else {
        window.location.href = result.url;
      }
    } catch {
      toast.error('Failed to change plan');
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="Billing" />
      <div className="flex-1 p-6">
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
                  <div>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>
                      Your current subscription details
                    </CardDescription>
                  </div>
                  {subscription && getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd)}
                </div>
              </CardHeader>
              <CardContent>
                {subscription ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Plan</p>
                        <p className="text-lg font-semibold">{subscription.planName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Price</p>
                        <p className="text-lg font-semibold">
                          {formatPrice(subscription.planPrice, subscription.planCurrency, subscription.planInterval)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Current Period</p>
                        <p className="text-sm">
                          {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {subscription.cancelAtPeriodEnd ? 'Ends On' : 'Renews On'}
                        </p>
                        <p className="text-sm">{formatDate(subscription.currentPeriodEnd)}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {subscription.cancelAtPeriodEnd && (
                        <Button
                          onClick={handleReactivate}
                          disabled={reactivateSubscription.isPending}
                        >
                          {reactivateSubscription.isPending ? 'Reactivating...' : 'Reactivate Subscription'}
                        </Button>
                      )}
                      {!subscription.cancelAtPeriodEnd && freePlan && !isCurrentPlan(freePlan) && (
                        <Button
                          variant="outline"
                          onClick={() => handleDowngrade(freePlan)}
                          disabled={upgradeSubscription.isPending || !!getDowngradeBlockReason(freePlan)}
                          title={getDowngradeBlockReason(freePlan) || undefined}
                        >
                          Downgrade to Free
                        </Button>
                      )}
                      {!subscription.cancelAtPeriodEnd && (
                        <Button
                          variant="destructive"
                          onClick={() => setCancelDialogOpen(true)}
                        >
                          Cancel Subscription
                        </Button>
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

            {/* Available Plans */}
            <Card>
              <CardHeader>
                <CardTitle>Available Plans</CardTitle>
                <CardDescription>
                  {subscription ? 'Upgrade or change your plan' : 'Choose a plan to get started'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-48 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative rounded-lg border p-4 ${
                          isCurrentPlan(plan) ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        {isCurrentPlan(plan) && (
                          <Badge className="absolute -top-2 right-2 bg-primary">
                            Current
                          </Badge>
                        )}
                        <div className="mb-4">
                          <h3 className="font-semibold">{plan.name}</h3>
                          <p className="text-2xl font-bold mt-1">
                            {formatPrice(plan.price, plan.currency, plan.interval)}
                          </p>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                          {getPlanFeatures(plan).map((feature, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        {!isCurrentPlan(plan) && (
                          <Button
                            className="w-full"
                            variant={isUpgrade(plan) ? 'default' : 'outline'}
                            onClick={() => {
                              if (isUpgrade(plan)) {
                                handleUpgrade(plan.id);
                              } else {
                                handleDowngrade(plan);
                              }
                            }}
                            disabled={upgradingPlanId !== null || (!isUpgrade(plan) && (subscription?.cancelAtPeriodEnd || !!getDowngradeBlockReason(plan)))}
                            title={!isUpgrade(plan) ? getDowngradeBlockReason(plan) || undefined : undefined}
                          >
                            {upgradingPlanId === plan.id
                              ? 'Processing...'
                              : isUpgrade(plan)
                              ? 'Upgrade'
                              : 'Downgrade'}
                          </Button>
                        )}
                        {isCurrentPlan(plan) && (
                          <Button className="w-full" variant="outline" disabled>
                            Current Plan
                          </Button>
                        )}
                      </div>
                    ))}
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
                    {usageData.billingPeriodStart && (
                      <p className="text-xs text-muted-foreground">
                        Period started: {formatDate(usageData.billingPeriodStart)}
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
          </div>
        )}
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You&apos;ll continue to have
              access until the end of your current billing period.
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

      {/* Downgrade Plan Dialog */}
      <AlertDialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade to {selectedDowngradePlan?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to downgrade to the {selectedDowngradePlan?.name} plan?
              {selectedDowngradePlan?.price === 0
                ? ' Your current plan benefits will end immediately.'
                : ' The change will take effect at your next billing cycle.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedDowngradePlan(null)}>
              Keep Current Plan
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDowngrade}
            >
              {upgradeSubscription.isPending ? 'Processing...' : 'Confirm Downgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
