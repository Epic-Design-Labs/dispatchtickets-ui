import { cn } from '@/lib/utils';

interface PillProps {
  /**
   * The leading dot. On by default: it is what lets a row be scanned by colour
   * at a glance without reading the words. Priority turns it off, because a
   * priority chip sits beside a status chip and two dots in a row read as a
   * list rather than two facts.
   */
  dot?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * The soft-filled chip used for status, priority and anything else that is one
 * short fact about a row.
 *
 * Deliberately not built on `Badge`: Badge carries a border and a pill-shaped
 * `overflow-hidden` that clips the dot, and its variants are all solid fills.
 */
export function Pill({ dot = true, className, style, children }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5',
        'text-xs font-medium whitespace-nowrap',
        className
      )}
      style={style}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
