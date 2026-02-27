export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'url'
  | 'array'
  | 'object';

export type EntityType = 'ticket' | 'customer' | 'company';

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  defaultValue?: unknown;
  description?: string;
  placeholder?: string;
  options?: string[];
  visible: boolean;
  showOnCreate: boolean;
  sortOrder: number;
  source?: string;
  createdAt: string;
}

export interface FieldDefinitions {
  ticket: FieldDefinition[];
  customer: FieldDefinition[];
  company: FieldDefinition[];
}

export interface CreateFieldInput {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
  placeholder?: string;
  options?: string[];
  visible?: boolean;
  showOnCreate?: boolean;
  sortOrder?: number;
  source?: string;
}

export interface UpdateFieldInput
  extends Partial<Omit<CreateFieldInput, 'key'>> {}
