import { apiClient } from './client';

/** Mirrors api/src/modules/presence. */
export type PresenceStatus = 'available' | 'busy' | 'away' | 'offline';

export interface BrandPresence {
  brandId: string;
  /** What routing uses: offline once the member's admin tab has been closed ~90s. */
  status: PresenceStatus;
  /** What the member chose. */
  intendedStatus: PresenceStatus;
  maxConcurrent: number;
  activeCount: number;
  hasCapacity: boolean;
}

export interface PresenceSummary {
  /** Best status across brands. */
  status: PresenceStatus;
  /** The status chosen on every brand, or 'mixed' if they differ. */
  intendedStatus: PresenceStatus | 'mixed';
  online: boolean;
  brands: BrandPresence[];
}

export interface MemberPresenceSummary extends PresenceSummary {
  memberId: string;
  name: string | null;
  email: string | null;
}

export const presenceApi = {
  mine: async (): Promise<PresenceSummary> => {
    const { data } = await apiClient.get<PresenceSummary>('/presence/me');
    return data;
  },

  setMine: async (status: PresenceStatus): Promise<PresenceSummary> => {
    const { data } = await apiClient.put<PresenceSummary>('/presence/me', { status });
    return data;
  },

  team: async (): Promise<MemberPresenceSummary[]> => {
    const { data } = await apiClient.get<{ data: MemberPresenceSummary[] }>('/presence');
    return data.data;
  },
};
