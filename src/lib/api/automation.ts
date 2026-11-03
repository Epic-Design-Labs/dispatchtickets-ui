import { apiClient } from './client';
import type {
  AutomationRule,
  RuleInput,
  RuleTestInput,
  RuleTestResponse,
} from '@/types/automation';

export const automationApi = {
  /** Rules in evaluation order; a later rule wins on a field an earlier one set. */
  list: async (brandId: string): Promise<AutomationRule[]> => {
    const response = await apiClient.get<AutomationRule[]>(`/brands/${brandId}/automation-rules`);
    return response.data;
  },

  create: async (brandId: string, data: RuleInput): Promise<AutomationRule> => {
    const response = await apiClient.post<AutomationRule>(`/brands/${brandId}/automation-rules`, data);
    return response.data;
  },

  update: async (brandId: string, id: string, data: Partial<RuleInput>): Promise<AutomationRule> => {
    const response = await apiClient.patch<AutomationRule>(
      `/brands/${brandId}/automation-rules/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (brandId: string, id: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/automation-rules/${id}`);
  },

  reorder: async (brandId: string, ruleIds: string[]): Promise<void> => {
    await apiClient.post(`/brands/${brandId}/automation-rules/reorder`, { ruleIds });
  },

  /**
   * Replay a draft against recent tickets. Writes nothing -- this is how a rule
   * earns trust before anyone enables it. It shows the rule's intent, not a
   * guess at the future: the API re-validates assignees, statuses and
   * categories when a rule actually fires, and the preview does not replay that.
   */
  test: async (brandId: string, data: RuleTestInput): Promise<RuleTestResponse> => {
    const response = await apiClient.post<RuleTestResponse>(
      `/brands/${brandId}/automation-rules/test`,
      data,
    );
    return response.data;
  },
};
