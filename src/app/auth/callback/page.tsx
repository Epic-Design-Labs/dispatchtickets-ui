'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const { verifyToken, refreshSession } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed) return;

    const handleCallback = async () => {
      setHasProcessed(true);

      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(error);
        toast.error('Authentication failed');
        return;
      }

      // Check for sessionToken param first
      let sessionToken = searchParams.get('sessionToken');

      // Also check 'token' param - if it's a JWT (starts with eyJ), it's already a session token
      const token = searchParams.get('token');
      if (!sessionToken && token && token.startsWith('eyJ')) {
        // Token is already a JWT session token from Stackbe
        sessionToken = token;
      }

      if (sessionToken) {
        // Store the session token directly - already verified by Stackbe
        localStorage.setItem('dispatch_session_token', sessionToken);

        // Refresh session to validate and get connected status
        const sessionData = await refreshSession();

        if (!sessionData) {
          setStatus('error');
          setErrorMessage('Session validation failed. Check console for details.');
          return;
        }

        setStatus('success');
        toast.success('Successfully signed in!');

        // Redirect based on connected status
        setTimeout(() => {
          window.location.href = sessionData.connected ? '/brands' : '/connect';
        }, 500);
        return;
      }

      // If we have a non-JWT token, try to verify it
      if (token) {
        try {
          const session = await verifyToken(token);
          if (session) {
            setStatus('success');
            toast.success('Successfully signed in!');
            setTimeout(() => {
              window.location.href = session.connected ? '/brands' : '/connect';
            }, 500);
            return;
          }
        } catch {
          // Token verification failed
        }
      }

      // No valid token found
      setStatus('error');
      setErrorMessage('No valid authentication token found');
    };

    handleCallback();
  }, [searchParams, verifyToken, refreshSession, hasProcessed]);

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Authentication Failed</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.location.href = '/login'}
              className="w-full"
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-lg font-medium">Successfully signed in!</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying your sign in...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
