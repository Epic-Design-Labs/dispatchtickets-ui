'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useCategories,
  useCategoryStats,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useTags,
  useTagStats,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
} from '@/lib/hooks';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GripVertical, Tag, FolderOpen } from 'lucide-react';
import { Category, Tag as TagType } from '@/types';

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

interface CategoryFormData {
  name: string;
  color: string;
  description: string;
}

interface TagFormData {
  name: string;
  color: string;
}

export default function CategoriesSettingsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  // Category state
  const { data: categories, isLoading: categoriesLoading } = useCategories(brandId);
  const { data: categoryStats } = useCategoryStats(brandId);
  const createCategory = useCreateCategory(brandId);
  const updateCategory = useUpdateCategory(brandId);
  const deleteCategory = useDeleteCategory(brandId);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    color: '#3b82f6',
    description: '',
  });

  // Tag state
  const { data: tags, isLoading: tagsLoading } = useTags(brandId);
  const { data: tagStats } = useTagStats(brandId);
  const createTag = useCreateTag(brandId);
  const updateTag = useUpdateTag(brandId);
  const deleteTag = useDeleteTag(brandId);

  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagType | null>(null);
  const [tagForm, setTagForm] = useState<TagFormData>({
    name: '',
    color: '#6b7280',
  });

  // Category handlers
  const handleOpenCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        color: category.color || '#6366f1',
        description: category.description || '',
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', color: '#3b82f6', description: '' });
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          categoryId: editingCategory.id,
          data: {
            name: categoryForm.name.trim(),
            color: categoryForm.color,
            description: categoryForm.description.trim() || undefined,
          },
        });
        toast.success('Category updated');
      } else {
        await createCategory.mutateAsync({
          name: categoryForm.name.trim(),
          color: categoryForm.color,
          description: categoryForm.description.trim() || undefined,
        });
        toast.success('Category created');
      }
      setCategoryDialogOpen(false);
    } catch {
      toast.error(editingCategory ? 'Failed to update category' : 'Failed to create category');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategory.mutateAsync(deletingCategory.id);
      toast.success('Category deleted');
      setDeletingCategory(null);
    } catch {
      toast.error('Failed to delete category');
    }
  };

  // Tag handlers
  const handleOpenTagDialog = (tag?: TagType) => {
    if (tag) {
      setEditingTag(tag);
      setTagForm({
        name: tag.name,
        color: tag.color || '#6b7280',
      });
    } else {
      setEditingTag(null);
      setTagForm({ name: '', color: '#6b7280' });
    }
    setTagDialogOpen(true);
  };

  const handleSaveTag = async () => {
    if (!tagForm.name.trim()) {
      toast.error('Tag name is required');
      return;
    }

    try {
      if (editingTag) {
        await updateTag.mutateAsync({
          tagId: editingTag.id,
          data: {
            name: tagForm.name.trim(),
            color: tagForm.color,
          },
        });
        toast.success('Tag updated');
      } else {
        await createTag.mutateAsync({
          name: tagForm.name.trim(),
          color: tagForm.color,
        });
        toast.success('Tag created');
      }
      setTagDialogOpen(false);
    } catch {
      toast.error(editingTag ? 'Failed to update tag' : 'Failed to create tag');
    }
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) return;
    try {
      await deleteTag.mutateAsync(deletingTag.id);
      toast.success('Tag deleted');
      setDeletingTag(null);
    } catch {
      toast.error('Failed to delete tag');
    }
  };

  const getCategoryTicketCount = (categoryId: string) => {
    const stat = categoryStats?.find((s) => s.id === categoryId);
    return stat?.ticketCount || 0;
  };

  const getTagTicketCount = (tagId: string) => {
    const stat = tagStats?.find((s) => s.id === tagId);
    return stat?.ticketCount || 0;
  };

  if (categoriesLoading || tagsLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Categories Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Categories
              </CardTitle>
              <CardDescription>
                Organize tickets into categories. Each ticket can have one category.
              </CardDescription>
            </div>
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenCategoryDialog()}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Edit Category' : 'Create Category'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory
                      ? 'Update the category details.'
                      : 'Create a new category to organize your tickets.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Name</Label>
                    <Input
                      id="category-name"
                      placeholder="e.g., Bug Report"
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category-description">Description (optional)</Label>
                    <Input
                      id="category-description"
                      placeholder="e.g., Issues with bugs or defects"
                      value={categoryForm.description}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                            categoryForm.color === color
                              ? 'border-foreground scale-110'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            setCategoryForm({ ...categoryForm, color })
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCategoryDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveCategory}
                    disabled={createCategory.isPending}
                  >
                    {createCategory.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {categories && categories.length > 0 ? (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color || '#6b7280' }}
                    />
                    <div>
                      <span className="font-medium">{category.name}</span>
                      {category.description && (
                        <p className="text-xs text-muted-foreground">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryTicketCount(category.id)} tickets
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenCategoryDialog(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingCategory(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <FolderOpen className="mb-2 h-8 w-8" />
              <p>No categories yet</p>
              <p className="text-sm">Create categories to organize your tickets</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </CardTitle>
              <CardDescription>
                Add tags to tickets for flexible labeling. Tickets can have multiple tags.
              </CardDescription>
            </div>
            <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenTagDialog()}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTag ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
                  <DialogDescription>
                    {editingTag
                      ? 'Update the tag details.'
                      : 'Create a new tag for labeling tickets.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="tag-name">Name</Label>
                    <Input
                      id="tag-name"
                      placeholder="e.g., urgent"
                      value={tagForm.name}
                      onChange={(e) =>
                        setTagForm({ ...tagForm, name: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Tag names will be converted to lowercase
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                            tagForm.color === color
                              ? 'border-foreground scale-110'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setTagForm({ ...tagForm, color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTag} disabled={createTag.isPending}>
                    {createTag.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {tags && tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="group flex items-center gap-1 rounded-full border px-3 py-1.5"
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color || '#6b7280' }}
                  />
                  <span className="text-sm">{tag.name}</span>
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                    {getTagTicketCount(tag.id)}
                  </Badge>
                  <button
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleOpenTagDialog(tag)}
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeletingTag(tag)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Tag className="mb-2 h-8 w-8" />
              <p>No tags yet</p>
              <p className="text-sm">Tags can be created here or on-the-fly when editing tickets</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingCategory?.name}&quot;?
              This will remove the category from {getCategoryTicketCount(deletingCategory?.id || '')} tickets.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Tag Confirmation */}
      <AlertDialog open={!!deletingTag} onOpenChange={() => setDeletingTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingTag?.name}&quot;?
              This will remove the tag from {getTagTicketCount(deletingTag?.id || '')} tickets.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
