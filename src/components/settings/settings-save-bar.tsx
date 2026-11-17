'use client';

import { Button } from '@/components/ui/button';
import { useUnsavedChanges } from '@/lib/hooks/use-unsaved-changes';
import { cn } from '@/lib/utils';

/**
 * The bar that appears when a settings page has edits to save.
 *
 * It replaces a Save button sitting at the bottom of a card, which on a long
 * page is below the fold exactly when it matters -- change the business hours
 * at the top of SLA settings and the button that keeps them is three screens
 * down. This rides at the bottom of the viewport instead, says what state the
 * page is in, and offers the way back as well as the way forward.
 *
 * Mounting it also registers the page with the unsaved-changes guard, so the
 * settings tabs ask before they throw the draft away. One import, both.
 */
export function SettingsSaveBar({
  dirty,
  saving = false,
  onSave,
  onDiscard,
  message = 'You have unsaved changes',
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  /** Omitted when a page has nothing to reset to; the bar then shows no Discard. */
  onDiscard?: () => void;
  message?: string;
}) {
  useUnsavedChanges(dirty);

  return (
    <div
      className={cn(
        // Sticky rather than fixed: it sits inside the settings column, so it
        // never covers the sidebar or reaches across a wide screen.
        'bg-foreground text-background sticky bottom-4 z-30 mt-4 flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-lg transition-all duration-200',
        dirty ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-5 opacity-0'
      )}
      // Hidden from screen readers while it is invisible, and its buttons are
      // disabled, which takes them out of the tab order too: a Save button
      // nobody can see should not be the next thing you tab to.
      aria-hidden={!dirty}
      role="region"
      aria-label="Unsaved changes"
    >
      <span className="flex-1 text-sm">{message}</span>
      {onDiscard && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDiscard}
          disabled={saving || !dirty}
          className="border-background/25 text-background hover:bg-background/10 hover:text-background bg-transparent"
        >
          Discard
        </Button>
      )}
      <Button size="sm" variant="secondary" onClick={onSave} disabled={saving || !dirty}>
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </div>
  );
}
