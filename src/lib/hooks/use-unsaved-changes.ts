'use client';

import { useEffect, useId } from 'react';

/**
 * Edits on this screen that have not been saved.
 *
 * Every settings page keeps its draft in local state and writes it on a Save
 * button, so leaving the page throws the draft away -- and the settings tabs
 * are ordinary links, so switching from SLA to Email mid-edit lost the work
 * silently, with nothing to undo it with. A page says it has edits, the tab
 * nav asks before it navigates, and the browser asks before it closes.
 *
 * A module-level set rather than context: the nav lives in a layout that does
 * not re-render when a page's draft changes, and the question it asks -- is
 * anything unsaved right now -- is a read at click time, not a render input.
 * Nothing re-renders when this changes, deliberately.
 */
const unsaved = new Set<string>();

/** Whether any mounted page is holding edits. Read it when leaving. */
export function hasUnsavedChanges(): boolean {
  return unsaved.size > 0;
}

/**
 * Declare whether this page is holding unsaved edits.
 *
 * Pass the page's own dirty flag. Unmounting clears it: a page that is gone
 * cannot be asked to save, and leaving a stale entry behind would make every
 * later navigation ask about edits that no longer exist.
 */
export function useUnsavedChanges(isDirty: boolean): void {
  // One stable key per mounted component, from React itself -- a module
  // counter bumped during render is a side effect in a place that must not
  // have one, and would hand the same page two keys across a double render.
  const key = useId();

  useEffect(() => {
    if (isDirty) {
      unsaved.add(key);
    } else {
      unsaved.delete(key);
    }
    return () => {
      unsaved.delete(key);
    };
  }, [isDirty, key]);

  useEffect(() => {
    if (!isDirty) return;
    // The text is the browser's own; a page cannot choose it. Registering the
    // listener only while dirty keeps Chrome's bfcache usable the rest of the
    // time.
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);
}
