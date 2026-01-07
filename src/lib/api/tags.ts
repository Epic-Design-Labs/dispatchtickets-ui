import { apiClient } from './client';

export interface Tag {
  id: string;
  brandId: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TagStats {
  id: string;
  name: string;
  color: string;
  ticketCount: number;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

export interface MergeTagsInput {
  sourceTagIds: string[];
  targetTagId: string;
}

export const tagsApi = {
  /**
   * List all tags for a brand
   */
  list: async (brandId: string): Promise<Tag[]> => {
    const response = await apiClient.get<Tag[]>(`/brands/${brandId}/tags`);
    return response.data;
  },

  /**
   * Get tag usage statistics for a brand
   */
  getStats: async (brandId: string): Promise<TagStats[]> => {
    const response = await apiClient.get<TagStats[]>(
      `/brands/${brandId}/tags/stats`
    );
    return response.data;
  },

  /**
   * Create a new tag
   */
  create: async (brandId: string, data: CreateTagInput): Promise<Tag> => {
    const response = await apiClient.post<Tag>(
      `/brands/${brandId}/tags`,
      data
    );
    return response.data;
  },

  /**
   * Update an existing tag
   */
  update: async (
    brandId: string,
    tagId: string,
    data: UpdateTagInput
  ): Promise<Tag> => {
    const response = await apiClient.patch<Tag>(
      `/brands/${brandId}/tags/${tagId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a tag
   */
  delete: async (brandId: string, tagId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/tags/${tagId}`);
  },

  /**
   * Merge multiple tags into a target tag
   * All tickets with source tags will be updated to use the target tag
   */
  merge: async (
    brandId: string,
    sourceTagIds: string[],
    targetTagId: string
  ): Promise<void> => {
    await apiClient.post(`/brands/${brandId}/tags/merge`, {
      sourceTagIds,
      targetTagId,
    });
  },
};
