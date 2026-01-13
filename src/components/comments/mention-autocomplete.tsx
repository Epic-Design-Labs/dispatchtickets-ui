'use client';

import { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import { TeamMember } from '@/types';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface MentionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  members: TeamMember[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onPaste?: (e: React.ClipboardEvent) => void;
}

function getDisplayName(member: TeamMember): string {
  if (member.firstName || member.lastName) {
    return [member.firstName, member.lastName].filter(Boolean).join(' ');
  }
  return member.email.split('@')[0];
}

function getMemberInitials(member: TeamMember): string {
  if (member.firstName && member.lastName) {
    return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  }
  if (member.firstName) {
    return member.firstName.slice(0, 2).toUpperCase();
  }
  return member.email.slice(0, 2).toUpperCase();
}

export const MentionAutocomplete = forwardRef<HTMLTextAreaElement, MentionAutocompleteProps>(
  function MentionAutocomplete(
    { value, onChange, members, placeholder, disabled, className, onPaste },
    forwardedRef
  ) {
    const [showPopover, setShowPopover] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (forwardedRef as React.RefObject<HTMLTextAreaElement>) || internalRef;
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter members by query
    const filteredMembers = members.filter((m) => {
      if (!mentionQuery) return true;
      const name = `${m.firstName || ''} ${m.lastName || ''} ${m.email}`.toLowerCase();
      return name.includes(mentionQuery.toLowerCase());
    });

    // Reset selected index when filtered results change
    useEffect(() => {
      setSelectedIndex(0);
    }, [filteredMembers.length]);

    // Calculate popover position based on cursor
    const updatePopoverPosition = useCallback(() => {
      const textarea = textareaRef.current;
      const container = containerRef.current;
      if (!textarea || !container) return;

      // Create a hidden div to measure text position
      const div = document.createElement('div');
      const style = window.getComputedStyle(textarea);

      // Copy textarea styles
      div.style.position = 'absolute';
      div.style.visibility = 'hidden';
      div.style.whiteSpace = 'pre-wrap';
      div.style.wordWrap = 'break-word';
      div.style.width = `${textarea.clientWidth}px`;
      div.style.font = style.font;
      div.style.padding = style.padding;
      div.style.lineHeight = style.lineHeight;

      // Get text up to cursor
      const textBeforeCursor = value.slice(0, mentionStartIndex + 1);
      div.textContent = textBeforeCursor;

      // Add a span to measure cursor position
      const span = document.createElement('span');
      span.textContent = '|';
      div.appendChild(span);

      document.body.appendChild(div);

      const spanRect = span.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const textareaRect = textarea.getBoundingClientRect();

      document.body.removeChild(div);

      // Calculate position relative to container
      const top = textareaRect.top - containerRect.top + spanRect.height + textarea.scrollTop + 4;
      const left = Math.min(
        spanRect.left - textareaRect.left + textarea.offsetLeft,
        container.clientWidth - 256 // Ensure popup doesn't overflow
      );

      setPopoverPosition({ top: Math.max(0, top), left: Math.max(0, left) });
    }, [value, mentionStartIndex, textareaRef]);

    // Handle text change
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        const cursorPos = e.target.selectionStart;

        onChange(text);

        // Find the @ trigger before cursor
        const textBeforeCursor = text.slice(0, cursorPos);

        // Find the last @ that could be a mention trigger
        // It should either be at the start or preceded by whitespace
        let atIndex = -1;
        for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
          if (textBeforeCursor[i] === '@') {
            // Check if it's at the start or preceded by whitespace
            if (i === 0 || /\s/.test(textBeforeCursor[i - 1])) {
              atIndex = i;
              break;
            }
          }
          // Stop looking if we hit whitespace (no valid @ trigger)
          if (/\s/.test(textBeforeCursor[i])) {
            break;
          }
        }

        if (atIndex !== -1) {
          const query = textBeforeCursor.slice(atIndex + 1);
          // Only show if no whitespace in query (still typing mention)
          if (!/\s/.test(query) && query.length <= 50) {
            setMentionQuery(query);
            setMentionStartIndex(atIndex);
            setShowPopover(true);
            return;
          }
        }

        setShowPopover(false);
      },
      [onChange]
    );

    // Update popover position when it becomes visible
    useEffect(() => {
      if (showPopover) {
        updatePopoverPosition();
      }
    }, [showPopover, updatePopoverPosition]);

    // Handle selecting a member
    const handleSelectMember = useCallback(
      (member: TeamMember) => {
        const displayName = getDisplayName(member);
        const before = value.slice(0, mentionStartIndex);
        const cursorPos = textareaRef.current?.selectionStart || value.length;
        const after = value.slice(cursorPos);
        const newValue = `${before}@[${displayName}](${member.id}) ${after}`;

        onChange(newValue);
        setShowPopover(false);
        setMentionQuery('');
        setMentionStartIndex(-1);

        // Focus textarea and set cursor position after the mention
        requestAnimationFrame(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.focus();
            const newCursorPos = before.length + displayName.length + member.id.length + 6; // @[](id) + space
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }
        });
      },
      [value, mentionStartIndex, onChange, textareaRef]
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showPopover || filteredMembers.length === 0) return;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev < filteredMembers.length - 1 ? prev + 1 : 0
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredMembers.length - 1
            );
            break;
          case 'Enter':
            e.preventDefault();
            if (filteredMembers[selectedIndex]) {
              handleSelectMember(filteredMembers[selectedIndex]);
            }
            break;
          case 'Escape':
            e.preventDefault();
            setShowPopover(false);
            break;
          case 'Tab':
            if (filteredMembers[selectedIndex]) {
              e.preventDefault();
              handleSelectMember(filteredMembers[selectedIndex]);
            }
            break;
        }
      },
      [showPopover, filteredMembers, selectedIndex, handleSelectMember]
    );

    // Close popover when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setShowPopover(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div ref={containerRef} className="relative">
        <textarea
          ref={textareaRef}
          className={cn(
            'flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          disabled={disabled}
        />

        {showPopover && filteredMembers.length > 0 && (
          <div
            className="absolute z-50 w-64 rounded-md border bg-popover shadow-md"
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
          >
            <Command>
              <CommandList>
                <CommandGroup>
                  {filteredMembers.slice(0, 8).map((member, index) => (
                    <CommandItem
                      key={member.id}
                      onSelect={() => handleSelectMember(member)}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer',
                        index === selectedIndex && 'bg-accent'
                      )}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {getMemberInitials(member)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {getDisplayName(member)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {member.email}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {filteredMembers.length === 0 && (
                  <CommandEmpty>No team members found</CommandEmpty>
                )}
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    );
  }
);
