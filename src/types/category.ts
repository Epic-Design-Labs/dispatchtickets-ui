export interface Category {
  id: string;
  brandId: string;
  name: string;
  color: string | null; // hex color
  description?: string | null;
  sortOrder: number;
  createdAt: string;
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
