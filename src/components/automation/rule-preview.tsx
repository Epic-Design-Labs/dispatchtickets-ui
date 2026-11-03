'use client';

import { Badge } from '@/components/ui/badge';
import { SKIP_REASON_LABELS, type RuleTestResponse, type RuleTestResult } from '@/types/automation';
import type { RuleVocabulary } from './rule-vocabulary';

/**
 * The dry run, rendered.
 *
 * This is the part that makes a rule trustworthy: it shows what the rule would
 * have done to tickets that really arrived, before it is allowed near one that
 * hasn't. The API writes nothing for it.
 */
export function RulePreview({
  result,
  vocab,
}: {
  result: RuleTestResponse;
  vocab: RuleVocabulary;
}) {
  if (result.considered === 0) {
    return (
      <p className="rounded-md border p-3 text-sm text-muted-foreground">
        This brand has no tickets to preview against yet.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm">
        <strong>
          {result.matched} of {result.considered}
        </strong>{' '}
        recent {result.considered === 1 ? 'ticket' : 'tickets'} would have been changed.
      </p>

      <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
        {result.results.map((row) => (
          <PreviewRow key={row.ticketId} row={row} vocab={vocab} />
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        The preview shows what the rule means, not what will be true later: when a rule really
        fires, the assignee is re-checked for brand access and the status and category must still
        exist. Anything dropped then is recorded in the activity log.
      </p>
    </div>
  );
}

function PreviewRow({ row, vocab }: { row: RuleTestResult; vocab: RuleVocabulary }) {
  return (
    <li className="flex items-start gap-3 p-2.5">
      <span className="shrink-0 font-mono text-xs text-muted-foreground">#{row.ticketNumber}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{row.title}</p>
        {row.matched ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {changeBadges(row, vocab).map((text, i) => (
              <Badge key={i} variant="secondary" className="font-normal">
                {text}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.reason ? SKIP_REASON_LABELS[row.reason] : 'No match'}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * The changes as readable phrases. `tags` comes back as the ticket's FULL tag
 * list after the rule's add/remove ops, not a delta, so it is labelled as the
 * resulting set rather than as something added.
 */
function changeBadges(row: RuleTestResult, vocab: RuleVocabulary): string[] {
  const changes = row.changes;
  if (!changes) return [];
  const out: string[] = [];

  if (changes.assigneeId) out.push(`Assign to ${vocab.describe('member', changes.assigneeId)}`);
  if (changes.priority) out.push(`Priority → ${changes.priority}`);
  if (changes.status) out.push(`Status → ${vocab.describe('status', changes.status)}`);
  if (changes.categoryId) out.push(`Category → ${vocab.describe('category', changes.categoryId)}`);
  if (changes.tags) out.push(`Tags → ${changes.tags.length ? changes.tags.join(', ') : 'none'}`);
  for (const id of changes.watchers ?? []) {
    out.push(`Watch: ${vocab.describe('member', id)}`);
  }

  return out.length ? out : ['No net change'];
}
