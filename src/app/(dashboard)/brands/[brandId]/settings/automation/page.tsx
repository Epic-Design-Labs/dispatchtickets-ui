'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useAutomationRules,
  useDeleteAutomationRule,
  useReorderAutomationRules,
  useUpdateAutomationRule,
} from '@/lib/hooks/use-automation';
import { useRuleVocabulary } from '@/components/automation/rule-vocabulary';
import { summarizeAction, summarizeCondition } from '@/components/automation/rule-summary';
import { RuleDialog } from '@/components/automation/rule-dialog';
import { formatTimeAgo } from '@/lib/utils';
import type { AutomationRule } from '@/types/automation';

function apiMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export default function AutomationSettingsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const { data: rules, isLoading } = useAutomationRules(brandId);
  const vocab = useRuleVocabulary(brandId);
  const updateRule = useUpdateAutomationRule(brandId);
  const reorder = useReorderAutomationRules(brandId);
  const deleteRule = useDeleteAutomationRule(brandId);

  const [editing, setEditing] = useState<AutomationRule | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AutomationRule | null>(null);

  const toggleEnabled = async (rule: AutomationRule, enabled: boolean) => {
    try {
      await updateRule.mutateAsync({ id: rule.id, data: { enabled } });
    } catch (err) {
      toast.error(apiMessage(err, 'Could not change the rule'));
    }
  };

  /**
   * Order is meaningful: a later rule wins on a field an earlier one set. Moved
   * with buttons rather than dragging -- it is keyboard-reachable, and the list
   * is short enough that a swap is clearer than a drop target.
   */
  const move = async (index: number, direction: -1 | 1) => {
    if (!rules) return;
    const target = index + direction;
    if (target < 0 || target >= rules.length) return;
    const ids = rules.map((r) => r.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await reorder.mutateAsync(ids);
    } catch (err) {
      toast.error(apiMessage(err, 'Could not reorder the rules'));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteRule.mutateAsync(deleting.id);
      toast.success(`Deleted "${deleting.name}"`);
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to delete'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Automation</CardTitle>
          <CardDescription>
            Route tickets as they arrive — &ldquo;when a ticket is tagged X, assign it to Y&rdquo;.
            Rules run on every new ticket for this brand, whatever channel it came in on, in the
            order below. A later rule wins on anything an earlier one set.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-1.5 h-4 w-4" />
          New rule
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !rules?.length ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No rules yet. A first one worth trying: when the ticket is tagged with the address it
              came in on, assign it to whoever owns that inbox.
            </p>
            <Button className="mt-3" size="sm" variant="outline" onClick={() => setEditing('new')}>
              Create a rule
            </Button>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {rules.map((rule, index) => (
              <li key={rule.id} className="flex items-start gap-3 p-3">
                <div className="flex flex-col pt-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label={`Move "${rule.name}" earlier`}
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label={`Move "${rule.name}" later`}
                    disabled={index === rules.length - 1 || reorder.isPending}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.name}</span>
                    {!rule.enabled && (
                      <Badge variant="outline" className="font-normal">
                        Off
                      </Badge>
                    )}
                    {rule.stopOnMatch && (
                      <Badge variant="secondary" className="font-normal">
                        Stops here
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">When</span>{' '}
                    {rule.conditions.length === 0
                      ? 'every new ticket'
                      : rule.conditions.map((c) => summarizeCondition(c, vocab)).join(' and ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">Then</span>{' '}
                    {rule.actions.map((a) => summarizeAction(a, vocab)).join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rule.fireCount === 0
                      ? 'Has not fired yet'
                      : `Fired ${rule.fireCount} ${rule.fireCount === 1 ? 'time' : 'times'}${
                          rule.lastFiredAt ? `, last ${formatTimeAgo(rule.lastFiredAt)}` : ''
                        }`}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Switch
                    checked={rule.enabled}
                    aria-label={`Enable "${rule.name}"`}
                    onCheckedChange={(checked) => toggleEnabled(rule, checked)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit "${rule.name}"`}
                    onClick={() => setEditing(rule)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete "${rule.name}"`}
                    onClick={() => setDeleting(rule)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {editing && (
        <RuleDialog
          brandId={brandId}
          rule={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleting?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              It stops running on new tickets. Tickets it already routed are left as they are. To
              pause it instead, switch it off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
