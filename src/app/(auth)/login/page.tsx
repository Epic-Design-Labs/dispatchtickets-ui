'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, ArrowLeft, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [noAccount, setNoAccount] = useState(false);
  const { sendMagicLink } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsLoading(true);
    setNoAccount(false);

    try {
      // Send magic link - Stackbe will reject if customer doesn't exist
      const result = await sendMagicLink(email.trim());
      if (result.success) {
        setEmailSent(true);
        toast.success('Magic link sent! Check your email.');
      } else if (result.notFound) {
        // Customer doesn't exist - show signup prompt
        setNoAccount(true);
      } else {
        toast.error('Failed to send magic link. Please try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setEmailSent(false);
    setNoAccount(false);
    setEmail('');
  };

  if (noAccount) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <UserPlus className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-bold">No account found</CardTitle>
            <CardDescription>
              We couldn&apos;t find an account for <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              You&apos;ll need to sign up first to create an account and get started with Dispatch Tickets.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="https://dispatchtickets.com/signup">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Sign up for an account
                </Link>
              </Button>
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try a different email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription>
              We sent a magic link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Click the link in the email to sign in. The link will expire in 15 minutes.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Use a different email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Dispatch Tickets</CardTitle>
          <CardDescription>
            Enter your email to sign in with a magic link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Magic Link'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            We&apos;ll send you an email with a link to sign in. No password required.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
