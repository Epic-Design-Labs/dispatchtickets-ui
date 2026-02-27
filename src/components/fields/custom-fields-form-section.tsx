'use client';

import { useFieldsByEntity } from '@/lib/hooks';
import { EntityType } from '@/types';
import { CustomFieldInput } from './custom-field-input';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomFieldsFormSectionProps {
  brandId: string;
  entityType: EntityType;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  /** When true, only show fields with showOnCreate !== false */
  createForm?: boolean;
}

export function CustomFieldsFormSection({
  brandId,
  entityType,
  values,
  onChange,
  errors,
  createForm,
}: CustomFieldsFormSectionProps) {
  const { data: fields, isLoading } = useFieldsByEntity(brandId, entityType);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Only show visible fields in forms, additionally filter by showOnCreate when in create context
  const visibleFields = fields
    ?.filter((f) => f.visible)
    .filter((f) => !createForm || f.showOnCreate !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!visibleFields || visibleFields.length === 0) {
    return null;
  }

  const handleFieldChange = (key: string, value: unknown) => {
    onChange({
      ...values,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4">
      {visibleFields.map((field) => (
        <CustomFieldInput
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(value) => handleFieldChange(field.key, value)}
          error={errors?.[field.key]}
        />
      ))}
    </div>
  );
}

/**
 * Validate custom field values against field definitions
 */
export function validateCustomFields(
  fields: { key: string; label: string; required: boolean; visible: boolean; showOnCreate?: boolean }[] | undefined,
  values: Record<string, unknown>,
  options?: { createForm?: boolean }
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!fields) return errors;

  for (const field of fields) {
    // Only validate visible required fields (respect showOnCreate filter in create context)
    if (field.visible && field.required) {
      if (options?.createForm && field.showOnCreate === false) continue;
      const value = values[field.key];
      if (value === undefined || value === null || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
        errors[field.key] = `${field.label} is required`;
      }
    }
  }

  return errors;
}
