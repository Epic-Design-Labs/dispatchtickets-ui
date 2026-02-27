'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreateField, useUpdateField } from '@/lib/hooks';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { EntityType, FieldDefinition, FieldType, CreateFieldInput } from '@/types';

const FIELD_TYPES: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'number', label: 'Number', description: 'Numeric value' },
  { value: 'boolean', label: 'Boolean', description: 'Yes/No toggle' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'select', label: 'Select', description: 'Single choice from options' },
  { value: 'multiselect', label: 'Multi-select', description: 'Multiple choices from options' },
  { value: 'url', label: 'URL', description: 'Clickable link' },
  { value: 'array', label: 'Array', description: 'List of text values' },
  { value: 'object', label: 'Object', description: 'Structured JSON data' },
];

interface FieldFormDialogProps {
  open: boolean;
  onClose: () => void;
  brandId: string;
  entityType: EntityType;
  editingField: FieldDefinition | null;
}

export function FieldFormDialog({
  open,
  onClose,
  brandId,
  entityType,
  editingField,
}: FieldFormDialogProps) {
  const createField = useCreateField(brandId, entityType);
  const updateField = useUpdateField(brandId, entityType);

  const [form, setForm] = useState<{
    key: string;
    label: string;
    type: FieldType;
    required: boolean;
    showOnCreate: boolean;
    showInTable: boolean;
    showInDetail: boolean;
    description: string;
    placeholder: string;
    options: string[];
  }>({
    key: '',
    label: '',
    type: 'text',
    required: false,
    showOnCreate: true,
    showInTable: true,
    showInDetail: true,
    description: '',
    placeholder: '',
    options: [],
  });

  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (editingField) {
      // Migrate legacy `visible` field for older definitions
      const legacyVisible = editingField.visible ?? true;
      setForm({
        key: editingField.key,
        label: editingField.label,
        type: editingField.type,
        required: editingField.required,
        showOnCreate: editingField.showOnCreate ?? legacyVisible,
        showInTable: editingField.showInTable ?? legacyVisible,
        showInDetail: editingField.showInDetail ?? legacyVisible,
        description: editingField.description || '',
        placeholder: editingField.placeholder || '',
        options: editingField.options || [],
      });
    } else {
      setForm({
        key: '',
        label: '',
        type: 'text',
        required: false,
        showOnCreate: true,
        showInTable: true,
        showInDetail: true,
        description: '',
        placeholder: '',
        options: [],
      });
    }
    setNewOption('');
  }, [editingField, open]);

  const generateKey = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^[0-9]/, 'field_$&');
  };

  const handleLabelChange = (label: string) => {
    if (!editingField) {
      setForm({
        ...form,
        label,
        key: generateKey(label),
      });
    } else {
      setForm({ ...form, label });
    }
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !form.options.includes(trimmed)) {
      setForm({ ...form, options: [...form.options, trimmed] });
      setNewOption('');
    }
  };

  const handleRemoveOption = (option: string) => {
    setForm({ ...form, options: form.options.filter((o) => o !== option) });
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error('Label is required');
      return;
    }

    if (!form.key.trim()) {
      toast.error('Key is required');
      return;
    }

    if (!form.key.match(/^[a-z][a-z0-9_]*$/)) {
      toast.error('Key must be snake_case starting with a letter');
      return;
    }

    if (['select', 'multiselect'].includes(form.type) && form.options.length === 0) {
      toast.error('At least one option is required for select fields');
      return;
    }

    try {
      const data: CreateFieldInput = {
        key: form.key,
        label: form.label.trim(),
        type: form.type,
        required: form.required,
        showOnCreate: form.showOnCreate,
        showInTable: form.showInTable,
        showInDetail: form.showInDetail,
        description: form.description.trim() || undefined,
        placeholder: form.placeholder.trim() || undefined,
        options: ['select', 'multiselect'].includes(form.type) ? form.options : undefined,
      };

      if (editingField) {
        const { key, ...updateData } = data;
        await updateField.mutateAsync({ key: editingField.key, data: updateData });
        toast.success('Field updated');
      } else {
        await createField.mutateAsync(data);
        toast.success('Field created');
      }
      onClose();
    } catch {
      toast.error(editingField ? 'Failed to update field' : 'Failed to create field');
    }
  };

  const showOptionsSection = ['select', 'multiselect'].includes(form.type);
  const isPending = createField.isPending || updateField.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingField ? 'Edit Field' : 'Create Field'}</DialogTitle>
          <DialogDescription>
            {editingField
              ? 'Update the field configuration.'
              : 'Add a new custom field to capture additional data.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              placeholder="e.g., Order ID"
              value={form.label}
              onChange={(e) => handleLabelChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-key">Key</Label>
            <Input
              id="field-key"
              placeholder="e.g., order_id"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              disabled={!!editingField}
              className={editingField ? 'bg-muted' : ''}
            />
            <p className="text-xs text-muted-foreground">
              Snake_case identifier used in the API. Cannot be changed after creation.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-type">Type</Label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm({ ...form, type: value as FieldType })}
            >
              <SelectTrigger id="field-type">
                <SelectValue placeholder="Select type">
                  {FIELD_TYPES.find(t => t.value === form.type)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showOptionsSection && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add option..."
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={handleAddOption}>
                  Add
                </Button>
              </div>
              {form.options.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {form.options.map((option) => (
                    <Badge
                      key={option}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {option}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(option)}
                        className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="field-description">Description (optional)</Label>
            <Textarea
              id="field-description"
              placeholder="Help text for agents filling out this field"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-placeholder">Placeholder (optional)</Label>
            <Input
              id="field-placeholder"
              placeholder="e.g., Enter order number"
              value={form.placeholder}
              onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="field-required" className="cursor-pointer">Required</Label>
              <p className="text-xs text-muted-foreground">
                Require this field to be filled when creating new records
              </p>
            </div>
            <Switch
              id="field-required"
              checked={form.required}
              onCheckedChange={(checked) => setForm({ ...form, required: checked })}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium">Visibility</Label>
            <div className="space-y-2">
              {entityType === 'ticket' && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="field-show-on-create" className="cursor-pointer">New ticket form</Label>
                    <p className="text-xs text-muted-foreground">
                      Show when creating new tickets
                    </p>
                  </div>
                  <Switch
                    id="field-show-on-create"
                    checked={form.showOnCreate}
                    onCheckedChange={(checked) => setForm({ ...form, showOnCreate: checked })}
                  />
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="field-show-in-table" className="cursor-pointer">Table columns</Label>
                  <p className="text-xs text-muted-foreground">
                    Available as a column in ticket lists
                  </p>
                </div>
                <Switch
                  id="field-show-in-table"
                  checked={form.showInTable}
                  onCheckedChange={(checked) => setForm({ ...form, showInTable: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="field-show-in-detail" className="cursor-pointer">Detail view</Label>
                  <p className="text-xs text-muted-foreground">
                    Show in the ticket detail sidebar
                  </p>
                </div>
                <Switch
                  id="field-show-in-detail"
                  checked={form.showInDetail}
                  onCheckedChange={(checked) => setForm({ ...form, showInDetail: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
