'use client';

import { useState } from 'react';
import { Header } from '@/components/layout';
import { useSubscription, usePlans, useCancelSubscription, useReactivateSubscription, useUpgradeSubscription } from '@/lib/hooks';
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
  const { data: subscriptionData, isLoading: subscriptionLoading, error: subscriptionError } = useSubscription();
  const { data: plansData, isLoading: plansLoading } = usePlans();
  const cancelSubscription = useCancelSubscription();
  const reactivateSubscription = useReactivateSubscription();
  const upgradeSubscription = useUpgradeSubscription();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const subscription = subscriptionData?.subscription;
  const plans = plansData?.plans || [];

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
    try {
      const result = await upgradeSubscription.mutateAsync({
        planId,
        successUrl: `${window.location.origin}/billing?upgraded=true`,
        cancelUrl: `${window.location.origin}/billing`,
      });
      // Redirect to Stripe checkout
      window.location.href = result.url;
    } catch {
      toast.error('Failed to start upgrade process');
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

  const getPlanFeatures = (plan: Plan) => {
    const features: string[] = [];
    const entitlements = plan.entitlements as Record<string, number | boolean>;

    if (entitlements.brands_limit === -1) {
      features.push('Unlimited brands');
    } else if (typeof entitlements.brands_limit === 'number') {
      features.push(`${entitlements.brands_limit} brand${entitlements.brands_limit === 1 ? '' : 's'}`);
    }

    if (entitlements.custom_domain) {
      features.push('Custom domain');
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
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-48 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                            onClick={() => handleUpgrade(plan.id)}
                            disabled={upgradeSubscription.isPending || subscription?.cancelAtPeriodEnd}
                          >
                            {upgradeSubscription.isPending
                              ? 'Processing...'
                              : isUpgrade(plan)
                              ? 'Upgrade'
                              : 'Switch'}
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
                <p className="text-sm text-muted-foreground">
                  Usage tracking coming soon. You&apos;ll be able to see how many tickets
                  you&apos;ve processed this billing period.
                </p>
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
    </div>
  );
}
