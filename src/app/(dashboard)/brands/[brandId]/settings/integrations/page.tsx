'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ShoppingCart, Zap, MessageCircle, Lightbulb } from 'lucide-react';
import { BigCommerceStoreCard } from '@/components/ecommerce';

export default function IntegrationsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
        <p className="text-muted-foreground">
          Connect third-party tools to enhance your support workflow
        </p>
      </div>

      {/* E-commerce Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>E-commerce</CardTitle>
              <CardDescription>
                Sync customer and order data from your store
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Shopify */}
            <div className="border rounded-lg p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded bg-[#95BF47] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                    <path d="M15.337 3.415c-.022-.165-.181-.247-.301-.259-.12-.011-2.448-.18-2.448-.18l-1.8-1.8c-.18-.18-.533-.126-.67-.087L8.93 1.5c-.373-1.07-1.03-2.053-2.185-2.053h-.101C6.252-.782 5.786-1 5.384-1 2.079-1-.001 2.456-.001 6.796c0 3.327 1.16 6.326 3.108 8.216l.053.05 3.625 12.938 7.168-1.55s-3.886-25.928-3.916-26.128l5.3.093zm-4.2-1.7l-.938.292c-.01-.078-.02-.155-.034-.232-.343-1.656-1.496-2.455-2.768-2.455h-.003c-.08 0-.16.006-.24.016.036-.046.072-.09.11-.132.713-.796 1.62-1.183 2.698-1.153.853.025 1.713.295 2.173.538-.316.97-.651 2.365-.998 3.126zM8.047.896c.082-.022.168-.032.255-.032.912 0 1.778.69 2.177 1.865.254.748.41 1.68.492 2.414l-2.47.765c.264-1.615.03-3.663-.454-5.012zm-1.8.587c.14-.425.34-.807.59-1.123.089.025.172.07.244.134.797.717 1.13 1.94.863 3.36l-2.11.654c.123-.955.258-2.157.413-3.025z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Shopify</h3>
                  <p className="text-sm text-muted-foreground">Sync orders and customers</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                View customer order history, create tickets from orders, and access customer data directly in tickets.
              </p>
              <Button variant="outline" className="mt-4 w-full" disabled>
                Connect Shopify
              </Button>
            </div>

            {/* BigCommerce */}
            <BigCommerceStoreCard brandId={brandId} />

            {/* WooCommerce */}
            <div className="border rounded-lg p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded bg-[#7F54B3] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                    <path d="M2.227 4.857A2.228 2.228 0 000 7.094v7.457c0 1.236 1.001 2.237 2.237 2.237h4.204l-1.012 3.786 4.825-3.786h11.519c1.236 0 2.237-1.001 2.237-2.237V7.094c0-1.236-1.001-2.237-2.237-2.237H2.227z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">WooCommerce</h3>
                  <p className="text-sm text-muted-foreground">Sync orders and customers</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                View customer order history, create tickets from orders, and access customer data directly in tickets.
              </p>
              <Button variant="outline" className="mt-4 w-full" disabled>
                Connect WooCommerce
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Automation</CardTitle>
              <CardDescription>
                Connect automation platforms to create tickets and sync data
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Zapier */}
            <div className="border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded bg-[#FF4A00] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.5 13.5h-3v3a1.5 1.5 0 01-3 0v-3h-3a1.5 1.5 0 010-3h3v-3a1.5 1.5 0 013 0v3h3a1.5 1.5 0 010 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Zapier</h3>
                  <p className="text-sm text-muted-foreground">5,000+ app integrations</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Create tickets from any app. Trigger workflows when tickets are created or updated.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href={`/brands/${brandId}/settings/channels`} className="inline-flex items-center">
                  View API Setup <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>

            {/* Make.com */}
            <div className="border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded bg-[#6D4AFF] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Make.com</h3>
                  <p className="text-sm text-muted-foreground">Visual automation builder</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Build complex workflows with a visual builder. Create tickets from any trigger.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href={`/brands/${brandId}/settings/channels`} className="inline-flex items-center">
                  View API Setup <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>

            {/* n8n */}
            <div className="border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded bg-[#EA4B71] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">n8n</h3>
                  <p className="text-sm text-muted-foreground">Self-hosted automation</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Open-source workflow automation. Self-host or use their cloud service.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href={`/brands/${brandId}/settings/channels`} className="inline-flex items-center">
                  View API Setup <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communication Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Communication</CardTitle>
              <CardDescription>
                Receive tickets from messaging platforms
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Slack */}
            <div className="border rounded-lg p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded bg-[#4A154B] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.52 2.521h-2.522V8.834zm-1.271 0a2.528 2.528 0 01-2.521 2.521 2.528 2.528 0 01-2.521-2.521V2.522A2.528 2.528 0 0115.166 0a2.528 2.528 0 012.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 012.521 2.522A2.528 2.528 0 0115.166 24a2.528 2.528 0 01-2.521-2.52v-2.522h2.521zm0-1.271a2.528 2.528 0 01-2.521-2.521 2.528 2.528 0 012.521-2.521h6.313A2.528 2.528 0 0124 15.166a2.528 2.528 0 01-2.52 2.521h-6.313z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Slack</h3>
                  <p className="text-sm text-muted-foreground">Create tickets from Slack</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Turn Slack messages into tickets. Reply to tickets directly from Slack.
              </p>
              <Button variant="outline" className="mt-4 w-full" disabled>
                Connect Slack
              </Button>
            </div>

            {/* Discord */}
            <div className="border rounded-lg p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded bg-[#5865F2] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Discord</h3>
                  <p className="text-sm text-muted-foreground">Create tickets from Discord</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Turn Discord messages into tickets. Manage support directly in your server.
              </p>
              <Button variant="outline" className="mt-4 w-full" disabled>
                Connect Discord
              </Button>
            </div>

            {/* Microsoft Teams */}
            <div className="border rounded-lg p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded bg-[#6264A7] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                    <path d="M20.625 8.073c.574 0 1.125.224 1.532.623.408.4.64.942.64 1.508v4.62c0 .566-.232 1.109-.64 1.508a2.184 2.184 0 01-1.532.623h-.313v2.97c0 .298-.12.583-.331.794a1.14 1.14 0 01-.8.329h-.064a1.14 1.14 0 01-.8-.33 1.116 1.116 0 01-.33-.793v-2.97h-2.5v2.97c0 .298-.12.583-.33.794a1.14 1.14 0 01-.8.329h-.063a1.14 1.14 0 01-.8-.33 1.116 1.116 0 01-.331-.793v-2.97h-.313a2.184 2.184 0 01-1.531-.623 2.116 2.116 0 01-.64-1.509v-4.62c0-.565.232-1.108.64-1.507a2.184 2.184 0 011.531-.623h7.875zm-8.438-5.018c1.012 0 1.983.397 2.7 1.103a3.74 3.74 0 011.118 2.661v.236h-7.5v-.236c0-.998.402-1.955 1.118-2.661a3.858 3.858 0 012.7-1.103h-.136zm6.188 1.89c.675 0 1.322.264 1.8.735.477.471.744 1.11.744 1.776s-.267 1.305-.744 1.776a2.562 2.562 0 01-1.8.735 2.562 2.562 0 01-1.8-.735 2.49 2.49 0 01-.744-1.776c0-.666.267-1.305.744-1.776a2.562 2.562 0 011.8-.735z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Microsoft Teams</h3>
                  <p className="text-sm text-muted-foreground">Create tickets from Teams</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Turn Teams messages into tickets. Collaborate on support within Teams.
              </p>
              <Button variant="outline" className="mt-4 w-full" disabled>
                Connect Teams
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Integration Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Request an Integration</CardTitle>
              <CardDescription>
                Don&apos;t see what you need? Let us know!
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            We&apos;re always adding new integrations. Submit a feature request to vote for the integrations you&apos;d like to see.
          </p>
          <Button variant="outline" asChild>
            <a href="/feature-requests">
              Submit Feature Request <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
