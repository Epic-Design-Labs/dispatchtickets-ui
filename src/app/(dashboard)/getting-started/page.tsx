'use client';

import { useRouter } from 'next/navigation';
import { useBrands } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Zap,
  Globe,
  Inbox,
  ArrowRight,
  CheckCircle,
  Clock,
  ExternalLink,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

interface SetupMethod {
  id: string;
  title: string;
  description: string;
  complexity: 'None' | 'Low' | 'Medium';
  bestFor: string;
  icon: React.ReactNode;
  features: string[];
}

const setupMethods: SetupMethod[] = [
  {
    id: 'default',
    title: 'Default Email (No Setup)',
    description: 'Start receiving tickets immediately with your unique Dispatch email address',
    complexity: 'None',
    bestFor: 'Testing & Quick Start',
    icon: <Zap className="h-6 w-6" />,
    features: [
      'Instant setup - works immediately',
      'Unique email: {brand}@inbound.dispatchtickets.com',
      'Replies sent from notifications@dispatchtickets.com',
      'Great for testing before going live',
    ],
  },
  {
    id: 'gmail',
    title: 'Gmail / Google Workspace',
    description: 'Connect your Gmail account to send and receive emails through your own address',
    complexity: 'Low',
    bestFor: 'Small Teams',
    icon: <Mail className="h-6 w-6" />,
    features: [
      'Connect via OAuth in seconds',
      'Use your existing Gmail/Workspace address',
      'Automatic email syncing',
      'No DNS configuration required',
    ],
  },
  {
    id: 'outbound-domain',
    title: 'Custom Outbound Domain',
    description: 'Send replies from your own domain (e.g., support@yourcompany.com)',
    complexity: 'Medium',
    bestFor: 'Professional Branding',
    icon: <Globe className="h-6 w-6" />,
    features: [
      'Custom sender address (support@yourdomain.com)',
      'Professional appearance for customers',
      'Requires DNS setup (DKIM, SPF records)',
      'Powered by Resend for reliable delivery',
    ],
  },
  {
    id: 'inbound-domain',
    title: 'Custom Inbound Domain',
    description: 'Receive tickets at your own subdomain (e.g., help@support.yourcompany.com)',
    complexity: 'Medium',
    bestFor: 'Full White-Label',
    icon: <Inbox className="h-6 w-6" />,
    features: [
      'Custom receiving address',
      'Complete brand control',
      'Requires MX record setup',
      'Works with Postmark for inbound parsing',
    ],
  },
];

function ComplexityBadge({ complexity }: { complexity: SetupMethod['complexity'] }) {
  const colors = {
    None: 'bg-green-100 text-green-700 border-green-200',
    Low: 'bg-blue-100 text-blue-700 border-blue-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };

  return (
    <Badge variant="outline" className={colors[complexity]}>
      {complexity === 'None' ? 'No Setup' : `${complexity} Complexity`}
    </Badge>
  );
}

export default function GettingStartedPage() {
  const router = useRouter();
  const { data: brands, isLoading } = useBrands();

  const hasBrands = brands && brands.length > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Getting Started with Dispatch Tickets</h1>
        <p className="text-muted-foreground text-lg">
          Set up your brand to start receiving and managing customer support tickets via email.
        </p>
      </div>

      {/* Quick Start CTA */}
      {!isLoading && !hasBrands && (
        <Card className="border-2 border-dashed border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Create Your First Brand</h3>
              <p className="text-muted-foreground">
                A brand is a separate workspace for managing tickets. Start by creating one.
              </p>
            </div>
            <Button onClick={() => router.push('/brands')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Brand
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Setup Methods */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Email Setup Methods</h2>
          <p className="text-sm text-muted-foreground">
            Choose the method that best fits your needs
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {setupMethods.map((method) => (
            <Card key={method.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-muted">{method.icon}</div>
                  <ComplexityBadge complexity={method.complexity} />
                </div>
                <CardTitle className="text-lg mt-3">{method.title}</CardTitle>
                <CardDescription>{method.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Best for:</span>{' '}
                  <span className="font-medium">{method.bestFor}</span>
                </div>
                <ul className="space-y-2">
                  {method.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Your Brands */}
      {hasBrands && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Brands</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <Card
                key={brand.id}
                className="hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/brands/${brand.id}/getting-started`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <h3 className="font-medium">{brand.name}</h3>
                    <p className="text-sm text-muted-foreground">View setup progress</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Links</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/brands">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 rounded-lg bg-muted">
                  <Inbox className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Your Brands</h3>
                  <p className="text-sm text-muted-foreground">Manage your brands</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <a
            href="https://dispatchtickets.com/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 rounded-lg bg-muted">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">API Documentation</h3>
                  <p className="text-sm text-muted-foreground">Developer resources</p>
                </div>
              </CardContent>
            </Card>
          </a>
          <Link href="/support">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 rounded-lg bg-muted">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Support</h3>
                  <p className="text-sm text-muted-foreground">Get help from our team</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
