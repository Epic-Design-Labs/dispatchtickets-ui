'use client';

import { useParams, useRouter } from 'next/navigation';
import { useBrand, useSetupStatus, SetupStep } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Circle,
  ArrowRight,
  Mail,
  Inbox,
  MessageSquare,
  FolderOpen,
  Users,
  Webhook,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

const stepIcons: Record<string, React.ReactNode> = {
  'brand-created': <Sparkles className="h-5 w-5" />,
  'email-receiving': <Inbox className="h-5 w-5" />,
  'email-sending': <Mail className="h-5 w-5" />,
  'autoresponse': <MessageSquare className="h-5 w-5" />,
  'categories': <FolderOpen className="h-5 w-5" />,
  'team': <Users className="h-5 w-5" />,
  'webhooks': <Webhook className="h-5 w-5" />,
};

function SetupStepCard({ step, brandId }: { step: SetupStep; brandId: string }) {
  const router = useRouter();
  const isComplete = step.completed;
  const isClickable = step.href && !isComplete;

  const handleClick = () => {
    if (step.href) {
      router.push(step.href);
    }
  };

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
        isComplete
          ? 'bg-green-50/50 border-green-200'
          : isClickable
          ? 'bg-background hover:border-primary/50 cursor-pointer'
          : 'bg-background'
      }`}
      onClick={isClickable ? handleClick : undefined}
    >
      {/* Status Icon */}
      <div
        className={`flex-shrink-0 p-2 rounded-full ${
          isComplete ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
        }`}
      >
        {isComplete ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          stepIcons[step.id] || <Circle className="h-5 w-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`font-medium ${isComplete ? 'text-green-700' : ''}`}>
            {step.title}
          </h3>
          {step.optional && (
            <Badge variant="outline" className="text-xs">
              Optional
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
        {step.detail && (
          <p className="text-sm font-medium text-green-600 mt-1">{step.detail}</p>
        )}
      </div>

      {/* Action */}
      {step.href && (
        <Button
          variant={isComplete ? 'ghost' : 'default'}
          size="sm"
          className="flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            router.push(step.href!);
          }}
        >
          {isComplete ? 'View' : 'Set Up'}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function BrandGettingStartedPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  const { data: brand, isLoading: brandLoading } = useBrand(brandId);
  const setupStatus = useSetupStatus(brandId);

  if (brandLoading || setupStatus.isLoading) {
    return <LoadingSkeleton />;
  }

  if (!brand) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-semibold">Brand not found</h1>
      </div>
    );
  }

  const requiredSteps = setupStatus.steps.filter((s) => !s.optional);
  const optionalSteps = setupStatus.steps.filter((s) => s.optional);
  const isComplete = setupStatus.percentComplete === 100;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Getting Started with {brand.name}</h1>
        <p className="text-muted-foreground">
          Complete these steps to start receiving and managing tickets for this brand.
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {isComplete ? (
                <span className="text-green-600">Setup Complete!</span>
              ) : (
                `${setupStatus.completedCount} of ${setupStatus.requiredCount} required steps complete`
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              {setupStatus.percentComplete}%
            </span>
          </div>
          <Progress value={setupStatus.percentComplete} className="h-2" />
        </CardContent>
      </Card>

      {/* Success Message */}
      {isComplete && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-2 rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-green-700">You&apos;re all set!</h3>
              <p className="text-sm text-green-600">
                Your brand is ready to receive tickets. Share your support email with customers.
              </p>
            </div>
            <Button asChild>
              <Link href={`/brands/${brandId}/tickets`}>View Tickets</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Required Steps */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Required Steps</h2>
        <div className="space-y-2">
          {requiredSteps.map((step) => (
            <SetupStepCard key={step.id} step={step} brandId={brandId} />
          ))}
        </div>
      </div>

      {/* Optional Steps */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-muted-foreground">Optional Steps</h2>
        <div className="space-y-2">
          {optionalSteps.map((step) => (
            <SetupStepCard key={step.id} step={step} brandId={brandId} />
          ))}
        </div>
      </div>

      {/* Help */}
      <Card className="bg-muted/50">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <h3 className="font-medium">Need help?</h3>
            <p className="text-sm text-muted-foreground">
              Check out our guides or contact support
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/getting-started">View Guides</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support">Contact Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
