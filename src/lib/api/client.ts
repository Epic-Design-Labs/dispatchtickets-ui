import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';
const SESSION_TOKEN_KEY = 'dispatch_session_token';

// Flag to prevent multiple simultaneous redirects on 401
let isRedirecting = false;

function getSessionToken(): string | null {
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

  // Request interceptor to add auth header
  client.interceptors.request.use(
    (config) => {
      if (typeof window !== 'undefined') {
        const sessionToken = getSessionToken();
        if (sessionToken) {
          config.headers.Authorization = `Bearer ${sessionToken}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      if (error.response?.status === 401) {
        // Clear stored token and redirect to login (only once)
        if (typeof window !== 'undefined' && !isRedirecting) {
          isRedirecting = true;
          localStorage.removeItem(SESSION_TOKEN_KEY);
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
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
