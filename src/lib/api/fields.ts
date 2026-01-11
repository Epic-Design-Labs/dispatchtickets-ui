import { apiClient } from './client';
import {
  FieldDefinition,
  FieldDefinitions,
  EntityType,
  CreateFieldInput,
  UpdateFieldInput,
} from '@/types';

export const fieldsApi = {
  /**
   * Get all field definitions for a brand
   */
  getAll: async (brandId: string): Promise<FieldDefinitions> => {
    const response = await apiClient.get<FieldDefinitions>(
      `/brands/${brandId}/fields`
    );
    return response.data;
  },

  /**
   * Get field definitions for a specific entity type
   */
  getByEntity: async (
    brandId: string,
    entityType: EntityType
  ): Promise<FieldDefinition[]> => {
    const response = await apiClient.get<FieldDefinition[]>(
      `/brands/${brandId}/fields/${entityType}`
    );
    return response.data;
  },

  /**
   * Create a new field definition
   */
  create: async (
    brandId: string,
    entityType: EntityType,
    data: CreateFieldInput
  ): Promise<FieldDefinition> => {
    const response = await apiClient.post<FieldDefinition>(
      `/brands/${brandId}/fields/${entityType}`,
      data
    );
    return response.data;
  },

  /**
   * Update a field definition
   */
  update: async (
    brandId: string,
    entityType: EntityType,
    key: string,
    data: UpdateFieldInput
  ): Promise<FieldDefinition> => {
    const response = await apiClient.patch<FieldDefinition>(
      `/brands/${brandId}/fields/${entityType}/${key}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a field definition
   */
  delete: async (
    brandId: string,
    entityType: EntityType,
    key: string
  ): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/fields/${entityType}/${key}`);
  },

  /**
   * Reorder field definitions
   */
  reorder: async (
    brandId: string,
    entityType: EntityType,
    keys: string[]
  ): Promise<FieldDefinition[]> => {
    const response = await apiClient.post<FieldDefinition[]>(
      `/brands/${brandId}/fields/${entityType}/reorder`,
      { keys }
    );
    return response.data;
  },
};
