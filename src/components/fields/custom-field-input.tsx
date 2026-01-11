'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, X, Plus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldDefinition } from '@/types';
import { useState } from 'react';

interface CustomFieldInputProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

export function CustomFieldInput({ field, value, onChange, error }: CustomFieldInputProps) {
  const [arrayInput, setArrayInput] = useState('');

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={field.placeholder}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(checked)}
            />
            <span className="text-sm text-muted-foreground">
              {value ? 'Yes' : 'No'}
            </span>
          </div>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !value && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value as string), 'PPP') : field.placeholder || 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value as string) : undefined}
                onSelect={(date) => onChange(date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(v) => onChange(v || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect': {
        const selectedValues = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 border rounded-md">
              {selectedValues.length > 0 ? (
                selectedValues.map((v) => (
                  <Badge key={v} variant="secondary" className="gap-1 pr-1">
                    {v}
                    <button
                      type="button"
                      onClick={() => onChange(selectedValues.filter((sv) => sv !== v))}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  {field.placeholder || 'Select options'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {field.options
                ?.filter((opt) => !selectedValues.includes(opt))
                .map((option) => (
                  <Badge
                    key={option}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => onChange([...selectedValues, option])}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {option}
                  </Badge>
                ))}
            </div>
          </div>
        );
      }

      case 'url': {
        const urlValue = value as string;
        return (
          <div className="flex gap-2">
            <Input
              type="url"
              value={urlValue || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder || 'https://'}
              className="flex-1"
            />
            {urlValue && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => window.open(urlValue, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      }

      case 'array': {
        const arrayValues = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={arrayInput}
                onChange={(e) => setArrayInput(e.target.value)}
                placeholder={field.placeholder || 'Add item...'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (arrayInput.trim()) {
                      onChange([...arrayValues, arrayInput.trim()]);
                      setArrayInput('');
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (arrayInput.trim()) {
                    onChange([...arrayValues, arrayInput.trim()]);
                    setArrayInput('');
                  }
                }}
              >
                Add
              </Button>
            </div>
            {arrayValues.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {arrayValues.map((item, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-1">
                    {item}
                    <button
                      type="button"
                      onClick={() => onChange(arrayValues.filter((_, i) => i !== index))}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'object':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : (value as string) || ''}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                // Keep raw string if not valid JSON
                onChange(e.target.value);
              }
            }}
            placeholder={field.placeholder || '{\n  "key": "value"\n}'}
            rows={4}
            className="font-mono text-sm"
          />
        );

      default:
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.key} className={error ? 'text-destructive' : ''}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderInput()}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
