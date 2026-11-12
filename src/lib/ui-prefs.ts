'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * Small localStorage-backed stores for interface preferences.
 *
 * These are PER DEVICE, deliberately. They are things like "is my sidebar
 * collapsed" and "which brands did I star" -- answers that belong to the
 * screen you are sitting at, not to your account. Moving them to the server
 * means a Profile column, an API field and a migration; worth doing if people
 * ask for their stars to follow them between machines, not before.
 *
 * `useSyncExternalStore` rather than `useState` + an effect, so every instance
 * of the sidebar (desktop and the mobile sheet) and every tab stay in step.
 */

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
/** Mirrors localStorage so getSnapshot is cheap and referentially stable. */
const cache = new Map<string, string | null>();
let storageBound = false;

function readRaw(key: string): string | null {
  if (cache.has(key)) return cache.get(key) ?? null;
  let value: string | null = null;
  try {
    value = window.localStorage.getItem(key);
  } catch {
    // Private mode, blocked site data, or no window. Treat as unset.
    value = null;
  }
  cache.set(key, value);
  return value;
}

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function writeRaw(key: string, value: string) {
  cache.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Still emit: the in-memory value is what this tab renders from, so the
    // preference works for the session even when it cannot be persisted.
  }
  emit(key);
}

function subscribe(key: string, listener: Listener): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);

  // Another tab changed it: drop the cached copy and let everyone re-read.
  if (!storageBound && typeof window !== 'undefined') {
    storageBound = true;
    window.addEventListener('storage', (event) => {
      if (!event.key) {
        cache.clear();
        listeners.forEach((_, k) => emit(k));
        return;
      }
      if (!listeners.has(event.key)) return;
      cache.delete(event.key);
      emit(event.key);
    });
  }

  return () => {
    set!.delete(listener);
  };
}

/**
 * The raw stored string, or `fallback`. Returns a STRING rather than a parsed
 * value on purpose: getSnapshot has to be referentially stable, and a fresh
 * object every call is an infinite render loop. Parse it in a useMemo.
 */
function useStoredString(key: string, fallback: string): string {
  const sub = useCallback((listener: Listener) => subscribe(key, listener), [key]);
  return useSyncExternalStore(
    sub,
    () => readRaw(key) ?? fallback,
    () => fallback,
  );
}

const COLLAPSED_KEY = 'dispatch_sidebar_collapsed';
const FAVORITE_BRANDS_KEY = 'dispatch_favorite_brands';

/** Whether the sidebar is showing as a narrow icon rail. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const raw = useStoredString(COLLAPSED_KEY, '0');
  const collapsed = raw === '1';
  const toggle = useCallback(() => {
    writeRaw(COLLAPSED_KEY, collapsed ? '0' : '1');
  }, [collapsed]);
  return [collapsed, toggle];
}

export interface FavoriteBrands {
  favorites: ReadonlySet<string>;
  isFavorite: (brandId: string) => boolean;
  toggle: (brandId: string) => void;
}

/** Brand ids the user has starred, so they sort to the top of the list. */
export function useFavoriteBrands(): FavoriteBrands {
  const raw = useStoredString(FAVORITE_BRANDS_KEY, '[]');

  const favorites = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(raw);
      return new Set(
        Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
      );
    } catch {
      // Someone else's key, or a half-written value. Start clean rather than
      // throwing inside a render.
      return new Set<string>();
    }
  }, [raw]);

  const toggle = useCallback(
    (brandId: string) => {
      const next = new Set(favorites);
      if (!next.delete(brandId)) next.add(brandId);
      writeRaw(FAVORITE_BRANDS_KEY, JSON.stringify([...next]));
    },
    [favorites]
  );

  const isFavorite = useCallback((brandId: string) => favorites.has(brandId), [favorites]);

  return { favorites, isFavorite, toggle };
}
