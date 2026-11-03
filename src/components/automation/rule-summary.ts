import {
  ACTION_LABELS,
  FIELD_LABELS,
  LIST_OPS,
  MEMBER_ACTIONS,
  OP_LABELS,
  VALUELESS_OPS,
  type RuleAction,
  type RuleCondition,
} from '@/types/automation';
import type { RuleVocabulary } from './rule-vocabulary';

/**
 * A rule in words, for the list page.
 *
 * Ids are translated back to names here for the same reason the editor does
 * it: a list of rules reading "assign to mem_01H8..." tells nobody whether
 * their routing is right.
 */

export function summarizeCondition(condition: RuleCondition, vocab: RuleVocabulary): string {
  const field = FIELD_LABELS[condition.field];
  const op = OP_LABELS[condition.op];

  if (VALUELESS_OPS.includes(condition.op)) return `${field} ${op}`;

  const describe = (value: string) => {
    switch (condition.field) {
      case 'category':
        return vocab.describe('category', value);
      case 'assignee':
        return vocab.describe('member', value);
      case 'status':
        return vocab.describe('status', value);
      case 'companyId':
        return vocab.describe('company', value);
      default:
        return value;
    }
  };

  if (LIST_OPS.includes(condition.op)) {
    const values = Array.isArray(condition.value) ? condition.value : [];
    return `${field} ${op} ${values.map(describe).join(', ') || '—'}`;
  }

  const value = typeof condition.value === 'string' ? condition.value : '';
  return `${field} ${op} ${describe(value) || '—'}`;
}

export function summarizeAction(action: RuleAction, vocab: RuleVocabulary): string {
  const label = ACTION_LABELS[action.type];

  if (MEMBER_ACTIONS.includes(action.type)) {
    const memberId = (action as { memberId?: string }).memberId ?? '';
    return `${label} ${vocab.describe('member', memberId) || '—'}`;
  }

  const value = (action as { value?: string }).value ?? '';
  switch (action.type) {
    case 'set_category':
      return `${label} ${vocab.describe('category', value) || '—'}`;
    case 'set_status':
      return `${label} ${vocab.describe('status', value) || '—'}`;
    default:
      return `${label} ${value || '—'}`;
  }
}
