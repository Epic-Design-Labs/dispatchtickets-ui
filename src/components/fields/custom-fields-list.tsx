'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  useFieldsByEntity,
  useDeleteField,
} from '@/lib/hooks';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  List,
  ListChecks,
  Link,
  Braces,
  Layers,
} from 'lucide-react';
import { EntityType, FieldDefinition, FieldType } from '@/types';
import { FieldFormDialog } from './field-form-dialog';

const FIELD_TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  boolean: <ToggleLeft className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  select: <List className="h-4 w-4" />,
  multiselect: <ListChecks className="h-4 w-4" />,
  url: <Link className="h-4 w-4" />,
  array: <Layers className="h-4 w-4" />,
  object: <Braces className="h-4 w-4" />,
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  boolean: 'Boolean',
  date: 'Date',
  select: 'Select',
  multiselect: 'Multi-select',
  url: 'URL',
  array: 'Array',
  object: 'Object',
};

const ENTITY_LABELS: Record<EntityType, string> = {
  ticket: 'Ticket',
  customer: 'Customer',
  company: 'Company',
};

interface CustomFieldsListProps {
  brandId: string;
  entityType: EntityType;
}

export function CustomFieldsList({ brandId, entityType }: CustomFieldsListProps) {
  const { data: fields, isLoading } = useFieldsByEntity(brandId, entityType);
  const deleteField = useDeleteField(brandId, entityType);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [deletingField, setDeletingField] = useState<FieldDefinition | null>(null);

  const handleOpenDialog = (field?: FieldDefinition) => {
    if (field) {
      setEditingField(field);
    } else {
      setEditingField(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingField(null);
  };

  const handleDeleteField = async () => {
    if (!deletingField) return;
    try {
      await deleteField.mutateAsync(deletingField.key);
      toast.success('Field deleted');
      setDeletingField(null);
    } catch {
      toast.error('Failed to delete field');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{ENTITY_LABELS[entityType]} Fields</CardTitle>
              <CardDescription>
                Define custom fields for {ENTITY_LABELS[entityType].toLowerCase()}s. These fields
                will appear in forms and detail views.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="mr-1 h-4 w-4" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields && fields.length > 0 ? (
            <div className="space-y-2">
              {fields
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        {FIELD_TYPE_ICONS[field.type]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{field.label}</span>
                          <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {field.key}
                          </code>
                          {field.required && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {field.source && (
                            <Badge variant="outline" className="text-xs">
                              {field.source}
                            </Badge>
                          )}
                          {!field.visible && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Hidden
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{FIELD_TYPE_LABELS[field.type]}</span>
                          {field.description && (
                            <>
                              <span>•</span>
                              <span>{field.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(field)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingField(field)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Layers className="mb-3 h-10 w-10" />
              <p className="font-medium">No custom fields</p>
              <p className="text-sm mt-1">
                Add custom fields to capture additional data for {ENTITY_LABELS[entityType].toLowerCase()}s
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add First Field
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <FieldFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        brandId={brandId}
        entityType={entityType}
        editingField={editingField}
      />

      <AlertDialog open={!!deletingField} onOpenChange={() => setDeletingField(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the field &quot;{deletingField?.label}&quot;?
              This will remove this field definition. Existing data in this field will
              remain but won&apos;t be displayed in forms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteField}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
