import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';
const SESSION_TOKEN_KEY = 'dispatch_session_token';

// Flag to prevent multiple simultaneous redirects on 401
let isRedirecting = false;

/**
 * Module-level slot for Clerk's async getToken. The ClerkTokenBridge component
 * calls setClerkTokenGetter once Clerk is ready. Until then, this is null and
 * we fall back to Stackbe-only auth (existing behavior preserved for current
 * customers).
 */
let clerkTokenGetter: (() => Promise<string | null>) | null = null;

export function setClerkTokenGetter(
  fn: (() => Promise<string | null>) | null,
): void {
  clerkTokenGetter = fn;
}

function getStackbeToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return null;
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor — Stackbe session token wins (existing customers
  // unaffected); Clerk JWT used as fallback for users who signed up via
  // the marketing site Clerk flow (Phase 1b).
  client.interceptors.request.use(
    async (config) => {
      if (typeof window !== 'undefined') {
        const stackbeToken = getStackbeToken();
        if (stackbeToken) {
          config.headers.Authorization = `Bearer ${stackbeToken}`;
        } else if (clerkTokenGetter) {
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

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      if (error.response?.status === 401) {
        // Clear stored token and redirect to login (only once).
        // Note: only the Stackbe token is cleared from localStorage. Clerk
        // session is managed by Clerk's SDK; redirecting to /login lets
        // Clerk's UI handle re-auth for those users.
        if (typeof window !== 'undefined' && !isRedirecting) {
          isRedirecting = true;
          localStorage.removeItem(SESSION_TOKEN_KEY);
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
}

export const apiClient = createApiClient();

// These are now managed by the auth provider, but kept for backwards compatibility
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
