import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';
const SESSION_TOKEN_KEY = 'dispatch_session_token';

/**
 * Module-level slot for Clerk's async getToken. The ClerkTokenBridge component
 * calls setClerkTokenGetter once Clerk is ready. Until then, requests that
 * would need Clerk auth wait briefly via a promise we resolve when the
 * getter arrives (kills the race where hooks fire before useEffect runs).
 */
let clerkTokenGetter: (() => Promise<string | null>) | null = null;
let clerkReadyResolve: (() => void) | null = null;
const clerkReadyPromise = new Promise<void>((resolve) => {
  clerkReadyResolve = resolve;
});

export function setClerkTokenGetter(
  fn: (() => Promise<string | null>) | null,
): void {
  clerkTokenGetter = fn;
  if (fn && clerkReadyResolve) {
    clerkReadyResolve();
    clerkReadyResolve = null;
  }
}

function getStackbeToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return null;
}

async function waitForClerkReady(maxMs = 5000): Promise<void> {
  await Promise.race([
    clerkReadyPromise,
    new Promise<void>((resolve) => setTimeout(resolve, maxMs)),
  ]);
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor — Stackbe session token wins; Clerk JWT is the
  // fallback for users authenticated via @clerk/nextjs. If no Stackbe token
  // is present we wait briefly for Clerk to be ready (up to 5s) so the
  // first batch of hook-driven requests don't race the ClerkTokenBridge.
  client.interceptors.request.use(
    async (config) => {
      if (typeof window !== 'undefined') {
        const stackbeToken = getStackbeToken();
        if (stackbeToken) {
          config.headers.Authorization = `Bearer ${stackbeToken}`;
        } else {
          if (!clerkTokenGetter) {
            await waitForClerkReady();
          }
          if (clerkTokenGetter) {
            const clerkToken = await clerkTokenGetter();
            if (clerkToken) {
              config.headers.Authorization = `Bearer ${clerkToken}`;
            }
          }
        }
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // Response interceptor — propagate errors but do NOT auto-redirect on 401.
  // The dashboard layout's auth guard handles unauthenticated state (and
  // Clerk's SDK handles session refresh). Auto-redirecting from here was
  // creating loops when an early API call fired before Clerk hydrated.
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => Promise.reject(error),
  );

  return client;
}

export const apiClient = createApiClient();

// Legacy helpers preserved for backwards compatibility with code that still
// expects a Stackbe-style session token in localStorage. Safe to delete in
// Phase 1e cleanup once nothing references them.
export function setApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_TOKEN_KEY, key);
  }
}

export function clearApiKey(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
}

export function hasApiKey(): boolean {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return false;
}
