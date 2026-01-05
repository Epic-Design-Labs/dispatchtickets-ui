'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  modifier?: 'ctrl' | 'alt' | 'shift' | 'meta';
}

// Global state for shortcuts modal
let openShortcutsModal: (() => void) | null = null;

export function setShortcutsModalOpener(opener: () => void) {
  openShortcutsModal = opener;
}

export function clearShortcutsModalOpener() {
  openShortcutsModal = null;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[] = []) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger if typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for ? key to open shortcuts modal
      if (e.key === '?' && openShortcutsModal) {
        e.preventDefault();
        openShortcutsModal();
        return;
      }

      // Check custom shortcuts
      for (const shortcut of shortcuts) {
        const modifierMatch =
          !shortcut.modifier ||
          (shortcut.modifier === 'ctrl' && e.ctrlKey) ||
          (shortcut.modifier === 'alt' && e.altKey) ||
          (shortcut.modifier === 'shift' && e.shiftKey) ||
          (shortcut.modifier === 'meta' && e.metaKey);

        if (e.key.toLowerCase() === shortcut.key.toLowerCase() && modifierMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Hook specifically for ticket navigation
export function useTicketNavigation(
  prevTicketId: string | null,
  nextTicketId: string | null,
  brandId: string
) {
  const router = useRouter();

  const goToPrev = useCallback(() => {
    if (prevTicketId) {
      router.push(`/brands/${brandId}/tickets/${prevTicketId}`);
    }
  }, [prevTicketId, brandId, router]);

  const goToNext = useCallback(() => {
    if (nextTicketId) {
      router.push(`/brands/${brandId}/tickets/${nextTicketId}`);
    }
  }, [nextTicketId, brandId, router]);

  useKeyboardShortcuts([
    { key: 'j', description: 'Previous ticket', action: goToPrev, modifier: 'meta' },
    { key: 'k', description: 'Next ticket', action: goToNext, modifier: 'meta' },
  ]);

  return { goToPrev, goToNext };
}
