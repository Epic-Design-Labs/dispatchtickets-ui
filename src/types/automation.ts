/**
 * Automation rules: "when a ticket is created and it is tagged X, assign it to Y".
 *
 * The vocabulary below mirrors api/src/modules/automation/rule-types.ts. It is
 * duplicated rather than imported because this is a separate deployable, and it
 * is deliberately the *whole* vocabulary: a field the API accepts but this file
 * omits would be invisible in the admin and unexplainable to the person using
 * it. If the API grows a field or an op, it goes here too.
 */

/** 'ticket.updated' is Phase 3 on the API side; it needs loop guards first. */
export const RULE_TRIGGERS = ['ticket.created'] as const;
export type RuleTrigger = (typeof RULE_TRIGGERS)[number];

export const CONDITION_FIELDS = [
  'tag',
  'category',
  'priority',
  'status',
  'source',
  'subject',
  'body',
  'requesterEmail',
  'requesterDomain',
  'companyId',
  'assignee',
  'senderAuth',
] as const;
export type ConditionField = (typeof CONDITION_FIELDS)[number];

export const CONDITION_OPS = [
  'is',
  'is_not',
  'contains',
  'not_contains',
  'in',
  'not_in',
  'is_set',
  'is_not_set',
] as const;
export type ConditionOp = (typeof CONDITION_OPS)[number];

/** Ops that take a list of values. */
export const LIST_OPS: readonly ConditionOp[] = ['in', 'not_in'];
/** Ops that take no value at all. */
export const VALUELESS_OPS: readonly ConditionOp[] = ['is_set', 'is_not_set'];

export const ACTION_TYPES = [
  'assign',
  'set_priority',
  'set_status',
  'add_tag',
  'remove_tag',
  'set_category',
  'add_watcher',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/** assign and add_watcher carry a memberId; everything else carries a value. */
export const MEMBER_ACTIONS: readonly ActionType[] = ['assign', 'add_watcher'];

export interface RuleCondition {
  field: ConditionField;
  /** Absent for is_set/is_not_set, an array for in/not_in, otherwise a string. */
  op: ConditionOp;
  value?: string | string[];
}

export type RuleAction =
  | { type: 'assign'; memberId: string }
  | { type: 'add_watcher'; memberId: string }
  | { type: 'set_priority'; value: string }
  /** A status *key* ('open', 'pending'), matching what PATCH /tickets takes. */
  | { type: 'set_status'; value: string }
  /** A tag *name*; the API creates it on demand, like the ticket API does. */
  | { type: 'add_tag'; value: string }
  | { type: 'remove_tag'; value: string }
  /** A category *id*, so renaming a category doesn't break the rule. */
  | { type: 'set_category'; value: string };

export interface AutomationRule {
  id: string;
  brandId: string;
  name: string;
  enabled: boolean;
  /** Evaluation order. A later rule wins on a field an earlier one set. */
  position: number;
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  actions: RuleAction[];
  stopOnMatch: boolean;
  skipSpam: boolean;
  skipAssigned: boolean;
  lastFiredAt: string | null;
  fireCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RuleInput {
  name: string;
  trigger?: RuleTrigger;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled?: boolean;
  stopOnMatch?: boolean;
  skipSpam?: boolean;
  skipAssigned?: boolean;
}

/** A draft replayed against real tickets. The API writes nothing for this. */
export interface RuleTestInput {
  name?: string;
  trigger?: RuleTrigger;
  conditions: RuleCondition[];
  actions: RuleAction[];
  skipSpam?: boolean;
  skipAssigned?: boolean;
  limit?: number;
  ticketIds?: string[];
}

export interface RuleTestResult {
  ticketId: string;
  ticketNumber: number;
  title: string;
  createdAt: string;
  matched: boolean;
  /** Present when matched. Only the fields the rule would actually change. */
  changes?: {
    assigneeId?: string;
    priority?: string;
    status?: string;
    categoryId?: string;
    tags?: string[];
    watchers?: string[];
  };
  /** Present when it did not match. */
  reason?: 'spam' | 'assigned' | 'no_match' | 'stopped';
}

export interface RuleTestResponse {
  considered: number;
  matched: number;
  results: RuleTestResult[];
}

// --- display vocabulary ------------------------------------------------------

export const FIELD_LABELS: Record<ConditionField, string> = {
  tag: 'Tag',
  category: 'Category',
  priority: 'Priority',
  status: 'Status',
  source: 'Source',
  subject: 'Subject',
  body: 'Message body',
  requesterEmail: 'Requester email',
  requesterDomain: 'Requester domain',
  companyId: 'Company',
  assignee: 'Assignee',
  senderAuth: 'Sender authentication',
};

export const OP_LABELS: Record<ConditionOp, string> = {
  is: 'is',
  is_not: 'is not',
  contains: 'contains',
  not_contains: 'does not contain',
  in: 'is any of',
  not_in: 'is none of',
  is_set: 'is set',
  is_not_set: 'is not set',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  assign: 'Assign to',
  set_priority: 'Set priority to',
  set_status: 'Set status to',
  add_tag: 'Add tag',
  remove_tag: 'Remove tag',
  set_category: 'Set category to',
  add_watcher: 'Add watcher',
};

export const SKIP_REASON_LABELS: Record<NonNullable<RuleTestResult['reason']>, string> = {
  spam: 'Filed as spam',
  assigned: 'Already assigned',
  no_match: 'Conditions did not match',
  stopped: 'An earlier rule stopped evaluation',
};

/**
 * What the API actually writes to Ticket.source. CHANNEL_TYPES in the API
 * declares a wider list (slack, sms, ...) that nothing writes yet, so offering
 * it here would mean offering conditions that can never be true.
 */
export const SOURCE_OPTIONS = [
  'api',
  'email',
  'chat',
  'web',
  'portal',
  'admin',
  'recurring',
] as const;

export const PRIORITY_OPTIONS = ['low', 'normal', 'medium', 'high', 'urgent'] as const;

/**
 * senderAuth is never 'pass' -- see api/src/modules/email/sender-auth.ts. The
 * only honest test a rule can make is "is not fail".
 */
export const SENDER_AUTH_OPTIONS = ['fail', 'unknown'] as const;
