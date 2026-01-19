import { apiClient } from './client';
import type {
  TicketWatcher,
  AddWatcherInput,
  UpdateWatcherPreferencesInput,
} from '@/types/watcher';

export const watchersApi = {
  /**
   * List all watchers for a ticket
   */
  list: async (brandId: string, ticketId: string): Promise<TicketWatcher[]> => {
    const response = await apiClient.get<TicketWatcher[]>(
      `/brands/${brandId}/tickets/${ticketId}/watchers`
    );
    return response.data;
  },

  /**
   * Add a watcher to a ticket
   */
  add: async (
    brandId: string,
    ticketId: string,
    data: AddWatcherInput
  ): Promise<TicketWatcher> => {
    const response = await apiClient.post<TicketWatcher>(
      `/brands/${brandId}/tickets/${ticketId}/watchers`,
      data
    );
    return response.data;
  },

  /**
   * Remove a watcher from a ticket
   */
  remove: async (
    brandId: string,
    ticketId: string,
    memberId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/brands/${brandId}/tickets/${ticketId}/watchers/${memberId}`
    );
  },

  /**
   * Update watcher notification preferences
   */
  updatePreferences: async (
    brandId: string,
    ticketId: string,
    memberId: string,
    data: UpdateWatcherPreferencesInput
  ): Promise<TicketWatcher> => {
    const response = await apiClient.patch<TicketWatcher>(
      `/brands/${brandId}/tickets/${ticketId}/watchers/${memberId}`,
      data
    );
    return response.data;
  },
};
