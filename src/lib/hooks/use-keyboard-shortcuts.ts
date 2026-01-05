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

interface TicketActions {
  onSpam?: () => void;
  onDelete?: () => void;
  onResolve?: () => void;
  onPending?: () => void;
  onSend?: () => void;
}

// Hook for ticket navigation and actions
export function useTicketNavigation(
  prevTicketId: string | null,
  nextTicketId: string | null,
  brandId: string,
  actions?: TicketActions
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

  const shortcuts: KeyboardShortcut[] = [
    // Navigation - plain keys like Gmail
    { key: 'j', description: 'Next ticket', action: goToNext },
    { key: 'k', description: 'Previous ticket', action: goToPrev },
  ];

  // Add action shortcuts if provided
  if (actions?.onSpam) {
    shortcuts.push({ key: 's', description: 'Mark as spam', action: actions.onSpam });
  }
  if (actions?.onDelete) {
    shortcuts.push({ key: 'd', description: 'Delete ticket', action: actions.onDelete });
  }
  if (actions?.onResolve) {
    shortcuts.push({ key: 'r', description: 'Resolve ticket', action: actions.onResolve });
  }
  if (actions?.onPending) {
    shortcuts.push({ key: 'p', description: 'Set to pending', action: actions.onPending });
  }
  if (actions?.onSend) {
    shortcuts.push({ key: 'e', description: 'Send reply', action: actions.onSend });
  }

  useKeyboardShortcuts(shortcuts);

  return { goToPrev, goToNext };
}
