'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Play, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateAutomationRule,
  useTestAutomationRule,
  useUpdateAutomationRule,
} from '@/lib/hooks/use-automation';
import {
  ACTION_LABELS,
  ACTION_TYPES,
  CONDITION_FIELDS,
  CONDITION_OPS,
  FIELD_LABELS,
  LIST_OPS,
  MEMBER_ACTIONS,
  OP_LABELS,
  VALUELESS_OPS,
  type ActionType,
  type AutomationRule,
  type ConditionField,
  type ConditionOp,
  type RuleAction,
  type RuleCondition,
  type RuleTestResponse,
} from '@/types/automation';
import {
  choicesForAction,
  choicesForField,
  describeKindForAction,
  FIELD_PLACEHOLDERS,
  useRuleVocabulary,
  type Choice,
  type RuleVocabulary,
} from './rule-vocabulary';
import { RulePreview } from './rule-preview';

/** Mirrors RULE_LIMITS in api/src/modules/automation/rule-schema.ts. */
const MAX_CONDITIONS = 20;
const MAX_ACTIONS = 10;

/** One datalist for every tag input in the dialog; ids must be unique. */
const TAG_DATALIST_ID = 'automation-tag-names';

function apiMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

/** How a condition's value is edited, given its op and whether the field enumerates. */
type ValueMode = 'none' | 'select' | 'multi' | 'text' | 'textList';

function valueMode(op: ConditionOp, choices: Choice[] | null): ValueMode {
  if (VALUELESS_OPS.includes(op)) return 'none';
  // contains/not_contains is a substring test, so it is free text even on a
  // field that enumerates -- "tag contains to:" is the whole point of the
  // receiving-address tags.
  if (op === 'contains' || op === 'not_contains') return 'text';
  if (LIST_OPS.includes(op)) return choices ? 'multi' : 'textList';
  return choices ? 'select' : 'text';
}

function conditionComplete(condition: RuleCondition): boolean {
  if (VALUELESS_OPS.includes(condition.op)) return true;
  if (LIST_OPS.includes(condition.op)) {
    return Array.isArray(condition.value) && condition.value.length > 0;
  }
  return typeof condition.value === 'string' && condition.value.trim().length > 0;
}

function actionComplete(action: RuleAction): boolean {
  if (MEMBER_ACTIONS.includes(action.type)) {
    return !!(action as { memberId?: string }).memberId?.trim();
  }
  return !!(action as { value?: string }).value?.trim();
}

/** A select that still shows a value the brand no longer offers. */
function ChoiceSelect({
  value,
  choices,
  placeholder,
  onChange,
  describe,
}: {
  value: string;
  choices: Choice[];
  placeholder: string;
  onChange: (value: string) => void;
  describe?: (value: string) => string;
}) {
  // A deleted category or a departed member must stay visible and selected,
  // otherwise opening the rule silently blanks it and saving loses it.
  const options =
    value && !choices.some((c) => c.value === value)
      ? [...choices, { value, label: describe ? describe(value) : value }]
      : choices;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">Nothing to choose yet</div>
        ) : (
          options.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

/** Toggleable options for the is-any-of / is-none-of ops. */
function MultiChoice({
  value,
  choices,
  onChange,
}: {
  value: string[];
  choices: Choice[];
  onChange: (value: string[]) => void;
}) {
  const extras = value.filter((v) => !choices.some((c) => c.value === v));
  const options = [...choices, ...extras.map((v) => ({ value: v, label: v }))];

  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">Nothing to choose yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((c) => {
        const on = value.includes(c.value);
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(on ? value.filter((v) => v !== c.value) : [...value, c.value])
            }
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
          >
            <Badge variant={on ? 'default' : 'outline'} className="cursor-pointer font-normal">
              {c.label}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

function ConditionRow({
  condition,
  vocab,
  onChange,
  onRemove,
}: {
  condition: RuleCondition;
  vocab: RuleVocabulary;
  onChange: (next: RuleCondition) => void;
  onRemove: () => void;
}) {
  const choices = choicesForField(condition.field, vocab);
  const mode = valueMode(condition.op, choices);

  // Changing the field or the op can make the existing value meaningless --
  // a tag name under "priority is", a string under "is any of". Resetting is
  // better than carrying a value that would quietly never match.
  const setField = (field: ConditionField) => onChange({ field, op: condition.op, value: undefined });
  const setOp = (op: ConditionOp) => {
    // Switching between two ops that both take a single string (is -> contains)
    // keeps what was typed; switching into or out of a list op cannot.
    const bothSingle =
      !LIST_OPS.includes(op) &&
      !VALUELESS_OPS.includes(op) &&
      typeof condition.value === 'string';
    onChange({
      field: condition.field,
      op,
      value: bothSingle ? condition.value : LIST_OPS.includes(op) ? [] : undefined,
    });
  };

  const describeFor = (v: string) => {
    if (condition.field === 'category') return vocab.describe('category', v);
    if (condition.field === 'assignee') return vocab.describe('member', v);
    if (condition.field === 'status') return vocab.describe('status', v);
    if (condition.field === 'companyId') return vocab.describe('company', v);
    return v;
  };

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start gap-2">
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <Select value={condition.field} onValueChange={(v) => setField(v as ConditionField)}>
            <SelectTrigger aria-label="Field">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_FIELDS.map((f) => (
                <SelectItem key={f} value={f}>
                  {FIELD_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={condition.op} onValueChange={(v) => setOp(v as ConditionOp)}>
            <SelectTrigger aria-label="Comparison">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_OPS.map((op) => (
                <SelectItem key={op} value={op}>
                  {OP_LABELS[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="icon" variant="ghost" aria-label="Remove condition" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {mode !== 'none' && (
        <div className="mt-2 pr-10">
          {mode === 'select' && (
            <ChoiceSelect
              value={typeof condition.value === 'string' ? condition.value : ''}
              choices={choices ?? []}
              placeholder="Choose a value"
              describe={describeFor}
              onChange={(value) => onChange({ ...condition, value })}
            />
          )}
          {mode === 'multi' && (
            <MultiChoice
              value={Array.isArray(condition.value) ? condition.value : []}
              choices={choices ?? []}
              onChange={(value) => onChange({ ...condition, value })}
            />
          )}
          {mode === 'text' && (
            <Input
              value={typeof condition.value === 'string' ? condition.value : ''}
              placeholder={FIELD_PLACEHOLDERS[condition.field] ?? 'Value'}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
            />
          )}
          {mode === 'textList' && (
            <Input
              value={Array.isArray(condition.value) ? condition.value.join(', ') : ''}
              placeholder="one, two, three"
              onChange={(e) =>
                onChange({
                  ...condition,
                  value: e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          )}
          {(condition.field === 'subject' || condition.field === 'body') &&
            (condition.op === 'is' || condition.op === 'is_not') && (
              <p className="mt-1 text-xs text-muted-foreground">
                This matches the whole {condition.field === 'subject' ? 'subject' : 'body'} exactly.
                You probably want &ldquo;contains&rdquo;.
              </p>
            )}
        </div>
      )}
    </div>
  );
}

function ActionRow({
  action,
  vocab,
  onChange,
  onRemove,
}: {
  action: RuleAction;
  vocab: RuleVocabulary;
  onChange: (next: RuleAction) => void;
  onRemove: () => void;
}) {
  const choices = choicesForAction(action.type, vocab) ?? [];
  const isMember = MEMBER_ACTIONS.includes(action.type);
  const current = isMember
    ? ((action as { memberId?: string }).memberId ?? '')
    : ((action as { value?: string }).value ?? '');
  const kind = describeKindForAction(action.type);

  const setType = (type: ActionType) =>
    onChange(
      MEMBER_ACTIONS.includes(type)
        ? ({ type, memberId: '' } as RuleAction)
        : ({ type, value: '' } as RuleAction),
    );

  const setValue = (value: string) =>
    onChange(
      isMember ? ({ type: action.type, memberId: value } as RuleAction) : ({ type: action.type, value } as RuleAction),
    );

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start gap-2">
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <Select value={action.type} onValueChange={(v) => setType(v as ActionType)}>
            <SelectTrigger aria-label="Action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ACTION_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {action.type === 'add_tag' || action.type === 'remove_tag' ? (
            <Input
              value={current}
              placeholder="tag name"
              list={TAG_DATALIST_ID}
              onChange={(e) => setValue(e.target.value)}
            />
          ) : (
            <ChoiceSelect
              value={current}
              choices={choices}
              placeholder="Choose"
              describe={kind ? (v) => vocab.describe(kind, v) : undefined}
              onChange={setValue}
            />
          )}
        </div>
        <Button size="icon" variant="ghost" aria-label="Remove action" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {action.type === 'add_tag' && (
        <p className="mt-1 pr-10 text-xs text-muted-foreground">
          A tag that doesn&apos;t exist yet is created when the rule fires.
        </p>
      )}
      {action.type === 'add_watcher' && (
        <p className="mt-1 pr-10 text-xs text-muted-foreground">
          Watchers get an email on every comment. A member whose address we can&apos;t resolve is
          skipped and recorded in the activity log.
        </p>
      )}
    </div>
  );
}

export function RuleDialog({
  brandId,
  rule,
  onClose,
}: {
  brandId: string;
  rule: AutomationRule | null;
  onClose: () => void;
}) {
  const vocab = useRuleVocabulary(brandId);
  const create = useCreateAutomationRule(brandId);
  const update = useUpdateAutomationRule(brandId);
  const test = useTestAutomationRule(brandId);

  const [name, setName] = useState(rule?.name ?? '');
  const [conditions, setConditions] = useState<RuleCondition[]>(rule?.conditions ?? []);
  const [actions, setActions] = useState<RuleAction[]>(rule?.actions ?? []);
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [stopOnMatch, setStopOnMatch] = useState(rule?.stopOnMatch ?? false);
  const [skipSpam, setSkipSpam] = useState(rule?.skipSpam ?? true);
  const [skipAssigned, setSkipAssigned] = useState(rule?.skipAssigned ?? true);
  const [preview, setPreview] = useState<RuleTestResponse | null>(null);

  const saving = create.isPending || update.isPending;
  const conditionsValid = conditions.every(conditionComplete);
  const actionsValid = actions.length > 0 && actions.every(actionComplete);
  const canSave = !!name.trim() && conditionsValid && actionsValid && !saving;
  const canPreview = conditionsValid && actionsValid && !test.isPending;

  // requesterEmail and requesterDomain are read off a From line, which anyone
  // can write. The engine has no way to tell -- see sender-auth.ts -- so the
  // warning belongs next to the rule, where someone is deciding to trust it.
  const usesForgeable = conditions.some(
    (c) => c.field === 'requesterEmail' || c.field === 'requesterDomain',
  );
  const guardsSender = conditions.some((c) => c.field === 'senderAuth');

  const addCondition = () =>
    setConditions([...conditions, { field: 'tag', op: 'is', value: '' }]);
  const addAction = () => setActions([...actions, { type: 'assign', memberId: '' }]);

  const runPreview = async () => {
    try {
      const result = await test.mutateAsync({
        name: name.trim() || 'Draft rule',
        conditions,
        actions,
        skipSpam,
        skipAssigned,
      });
      setPreview(result);
    } catch (err) {
      toast.error(apiMessage(err, 'Could not run the preview'));
    }
  };

  const save = async () => {
    const data = {
      name: name.trim(),
      conditions,
      actions,
      enabled,
      stopOnMatch,
      skipSpam,
      skipAssigned,
    };
    try {
      if (rule) await update.mutateAsync({ id: rule.id, data });
      else await create.mutateAsync(data);
      toast.success(rule ? `Saved "${data.name}"` : `Created "${data.name}"`);
      onClose();
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to save the rule'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit rule' : 'New rule'}</DialogTitle>
          <DialogDescription>
            Runs on every ticket this brand receives, however it arrives — API, email, chat or the
            portal.
          </DialogDescription>
        </DialogHeader>

        <datalist id={TAG_DATALIST_ID}>
          {vocab.tags.map((t) => (
            <option key={t.value} value={t.value} />
          ))}
        </datalist>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Vendor mail to Dana"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>When</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={addCondition}
                disabled={conditions.length >= MAX_CONDITIONS}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add condition
              </Button>
            </div>
            {conditions.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No conditions — this rule runs on <strong>every</strong> new ticket.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {conditions.map((condition, i) => (
                    <ConditionRow
                      key={i}
                      condition={condition}
                      vocab={vocab}
                      onChange={(next) =>
                        setConditions(conditions.map((c, j) => (j === i ? next : c)))
                      }
                      onRemove={() => setConditions(conditions.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
                {conditions.length > 1 && (
                  <p className="text-xs text-muted-foreground">All conditions must be true.</p>
                )}
              </>
            )}

            {usesForgeable && (
              <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-600" />
                <div className="space-y-1">
                  <p>
                    <strong>The requester address can be forged.</strong> It comes from the
                    email&apos;s From line, which anyone can write, so a rule keyed off it can be
                    triggered by someone pretending to be that sender.
                  </p>
                  {!guardsSender && (
                    <p>
                      Adding <span className="font-mono">Sender authentication is not fail</span>{' '}
                      rules out senders whose own domain disowns the message. It is the only check
                      available — we never report a sender as verified.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Then</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={addAction}
                disabled={actions.length >= MAX_ACTIONS}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add action
              </Button>
            </div>
            {actions.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Add at least one action.
              </p>
            ) : (
              <div className="space-y-2">
                {actions.map((action, i) => (
                  <ActionRow
                    key={i}
                    action={action}
                    vocab={vocab}
                    onChange={(next) => setActions(actions.map((a, j) => (j === i ? next : a)))}
                    onRemove={() => setActions(actions.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <ToggleRow
              id="rule-enabled"
              label="Enabled"
              hint="A disabled rule is kept but never evaluated."
              checked={enabled}
              onChange={setEnabled}
            />
            <ToggleRow
              id="rule-skip-spam"
              label="Skip tickets filed as spam"
              hint="Blocked senders arrive as spam; routing them defeats the block."
              checked={skipSpam}
              onChange={setSkipSpam}
            />
            <ToggleRow
              id="rule-skip-assigned"
              label="Skip tickets that already have an assignee"
              hint="Protects a deliberate assignment. Checked against the assignee the ticket had before any rule ran."
              checked={skipAssigned}
              onChange={setSkipAssigned}
            />
            <ToggleRow
              id="rule-stop"
              label="Stop after this rule matches"
              hint="Later rules are skipped entirely for that ticket."
              checked={stopOnMatch}
              onChange={setStopOnMatch}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Preview</Label>
                <p className="text-xs text-muted-foreground">
                  Replays this rule against recent tickets. Nothing is saved or changed.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={runPreview} disabled={!canPreview}>
                {test.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-4 w-4" />
                )}
                Run preview
              </Button>
            </div>
            {!actionsValid && (
              <p className="text-xs text-muted-foreground">
                Fill in every condition and action to preview.
              </p>
            )}
            {preview && <RulePreview result={preview} vocab={vocab} />}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {rule ? 'Save' : 'Create rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
