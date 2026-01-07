import { apiClient } from './client';

export interface Category {
  id: string;
  brandId: string;
  name: string;
  color: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryStats {
  id: string;
  name: string;
  color: string;
  ticketCount: number;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  description?: string;
  sortOrder?: number;
}

export const categoriesApi = {
  /**
   * List all categories for a brand
   */
  list: async (brandId: string): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>(
      `/brands/${brandId}/categories`
    );
    return response.data;
  },

  /**
   * Get category usage statistics for a brand
   */
  getStats: async (brandId: string): Promise<CategoryStats[]> => {
    const response = await apiClient.get<CategoryStats[]>(
      `/brands/${brandId}/categories/stats`
    );
    return response.data;
  },

  /**
   * Create a new category
   */
  create: async (
    brandId: string,
    data: CreateCategoryInput
  ): Promise<Category> => {
    const response = await apiClient.post<Category>(
      `/brands/${brandId}/categories`,
      data
    );
    return response.data;
  },

  /**
   * Update an existing category
   */
  update: async (
    brandId: string,
    categoryId: string,
    data: UpdateCategoryInput
  ): Promise<Category> => {
    const response = await apiClient.patch<Category>(
      `/brands/${brandId}/categories/${categoryId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a category
   */
  delete: async (brandId: string, categoryId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/categories/${categoryId}`);
  },

  /**
   * Reorder categories by providing the new order of category IDs
   */
  reorder: async (brandId: string, categoryIds: string[]): Promise<void> => {
    await apiClient.post(`/brands/${brandId}/categories/reorder`, {
      categoryIds,
    });
  },
};
