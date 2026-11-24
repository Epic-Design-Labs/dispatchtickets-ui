import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dispatchtickets.com/v1';

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

  // Request interceptor: the Clerk JWT. Until the ClerkTokenBridge has
  // registered Clerk's getter, wait briefly (up to 5s) so the first batch of
  // hook-driven requests doesn't race it.
  client.interceptors.request.use(
    async (config) => {
      if (typeof window !== 'undefined') {
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

export async function getAuthToken(): Promise<string | null> {
  if (!clerkTokenGetter) await waitForClerkReady();
  if (clerkTokenGetter) return clerkTokenGetter();
  return null;
}
