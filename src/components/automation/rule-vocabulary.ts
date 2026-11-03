'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api/companies';
import { useTags } from '@/lib/hooks/use-tags';
import { useCategories } from '@/lib/hooks/use-categories';
import { useStatuses } from '@/lib/hooks/use-statuses';
import { useTeamMembers } from '@/lib/hooks/use-team';
import {
  ActionType,
  ConditionField,
  PRIORITY_OPTIONS,
  SENDER_AUTH_OPTIONS,
  SOURCE_OPTIONS,
} from '@/types/automation';

/** How many companies the pickers load. Brands with more need the API. */
const COMPANY_PAGE = 200;

export interface Choice {
  value: string;
  label: string;
}

export interface RuleVocabulary {
  tags: Choice[];
  categories: Choice[];
  statuses: Choice[];
  members: Choice[];
  companies: Choice[];
  priorities: Choice[];
  sources: Choice[];
  senderAuth: Choice[];
  isLoading: boolean;
  /** Turn a stored value back into something readable. Ids are not. */
  describe: (kind: 'member' | 'category' | 'status' | 'tag' | 'company', value: string) => string;
}

/**
 * Everything a rule can name, loaded from the brand it belongs to.
 *
 * A rule stores ids for members and categories and *names* for tags, because
 * that is what the API matches on -- see the per-field notes in
 * types/automation.ts. The admin therefore has to translate in both
 * directions, which is what `describe` is for: without it a saved rule reads
 * "assign to mem_01H8..." and nobody can check their own work.
 */
export function useRuleVocabulary(brandId: string): RuleVocabulary {
  const { data: tags, isLoading: tagsLoading } = useTags(brandId);
  const { data: categories, isLoading: categoriesLoading } = useCategories(brandId);
  const { data: statuses, isLoading: statusesLoading } = useStatuses(brandId);
  // Scoped to this brand: a member who cannot reach it would be dropped at fire
  // time anyway, and offering them here would promise something that won't happen.
  const { data: team, isLoading: teamLoading } = useTeamMembers({ brandId });
  // Called directly rather than through useCompanies so the page size can be
  // raised: a company missing from the picker is a condition nobody can write,
  // and 'cmp_...' is not an id anyone types from memory.
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['companies', brandId, 'rule-vocabulary'],
    queryFn: () => companiesApi.list(brandId, { limit: COMPANY_PAGE }),
    enabled: !!brandId,
    staleTime: 60_000,
  });

  return useMemo(() => {
    const tagChoices: Choice[] = (tags ?? []).map((t) => ({ value: t.name, label: t.name }));
    const categoryChoices: Choice[] = (categories ?? []).map((c) => ({
      value: c.id,
      label: c.name,
    }));
    const statusChoices: Choice[] = (statuses ?? [])
      .filter((s) => s.isActive)
      .map((s) => ({ value: s.key, label: s.name }));
    const companyChoices: Choice[] = (companies?.data ?? []).map((c) => ({
      value: c.id,
      label: c.name,
    }));
    const memberChoices: Choice[] = (team?.members ?? []).map((m) => ({
      value: m.id,
      label: [m.firstName, m.lastName].filter(Boolean).join(' ').trim() || m.email,
    }));

    const describe: RuleVocabulary['describe'] = (kind, value) => {
      const table =
        kind === 'member'
          ? memberChoices
          : kind === 'category'
            ? categoryChoices
            : kind === 'status'
              ? statusChoices
              : kind === 'company'
                ? companyChoices
                : tagChoices;
      // Falling back to the raw value matters: a member who left, or a category
      // someone deleted, should still be visible in the rule rather than blank.
      return table.find((c) => c.value === value)?.label ?? value;
    };

    return {
      tags: tagChoices,
      categories: categoryChoices,
      statuses: statusChoices,
      members: memberChoices,
      companies: companyChoices,
      priorities: PRIORITY_OPTIONS.map((p) => ({ value: p, label: p })),
      sources: SOURCE_OPTIONS.map((s) => ({ value: s, label: s })),
      senderAuth: SENDER_AUTH_OPTIONS.map((s) => ({
        value: s,
        label: s === 'fail' ? 'fail (domain disowns the sender)' : 'unknown (no verdict)',
      })),
      isLoading:
        tagsLoading || categoriesLoading || statusesLoading || teamLoading || companiesLoading,
      describe,
    };
  }, [
    tags,
    categories,
    statuses,
    team,
    companies,
    tagsLoading,
    categoriesLoading,
    statusesLoading,
    teamLoading,
    companiesLoading,
  ]);
}

/**
 * The choices a condition field offers, or null when it is free text.
 *
 * Free text is not a fallback for "we didn't bother": subject, body and the
 * requester fields are genuinely open, and a tag may be typed for one that
 * does not exist yet.
 */
export function choicesForField(field: ConditionField, vocab: RuleVocabulary): Choice[] | null {
  switch (field) {
    case 'tag':
      return vocab.tags;
    case 'category':
      return vocab.categories;
    case 'priority':
      return vocab.priorities;
    case 'status':
      return vocab.statuses;
    case 'source':
      return vocab.sources;
    case 'assignee':
      return vocab.members;
    case 'senderAuth':
      return vocab.senderAuth;
    case 'subject':
    case 'body':
    case 'requesterEmail':
    case 'requesterDomain':
      return null;
    case 'companyId':
      return vocab.companies;
  }
}

/** The choices an action's value offers. Member actions are handled separately. */
export function choicesForAction(type: ActionType, vocab: RuleVocabulary): Choice[] | null {
  switch (type) {
    case 'set_priority':
      return vocab.priorities;
    case 'set_status':
      return vocab.statuses;
    case 'set_category':
      return vocab.categories;
    case 'add_tag':
    case 'remove_tag':
      return vocab.tags;
    case 'assign':
    case 'add_watcher':
      return vocab.members;
  }
}

/** Which lookup table an action's value should be read against, for display. */
export function describeKindForAction(type: ActionType): Parameters<RuleVocabulary['describe']>[0] | null {
  switch (type) {
    case 'assign':
    case 'add_watcher':
      return 'member';
    case 'set_category':
      return 'category';
    case 'set_status':
      return 'status';
    case 'add_tag':
    case 'remove_tag':
      return 'tag';
    case 'set_priority':
      return null;
  }
}

/** Placeholder copy for the free-text fields, so the format is never a guess. */
export const FIELD_PLACEHOLDERS: Partial<Record<ConditionField, string>> = {
  subject: 'refund',
  body: 'cancel my order',
  requesterEmail: 'someone@example.com',
  requesterDomain: 'example.com',
};
