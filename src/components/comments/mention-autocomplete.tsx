'use client';

import { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import { SavedReply, TeamMember } from '@/types';
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
  /** Keys the mention list doesn't use (it owns Enter/Tab/arrows while open). */
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  /** When given, '#' opens these the way '@' opens team members. */
  savedReplies?: SavedReply[];
  /** Turns a saved reply's body into the text to insert (fills its variables). */
  renderReply?: (body: string) => string;
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
    { value, onChange, members, placeholder, disabled, className, onPaste, onKeyDown, savedReplies, renderReply },
    forwardedRef
  ) {
    const [showPopover, setShowPopover] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [trigger, setTrigger] = useState<'@' | '#'>('@');
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

    // '#refund' matches shortcuts by prefix first, then titles containing it.
    const filteredReplies = (() => {
      const q = mentionQuery.toLowerCase();
      const all = savedReplies ?? [];
      if (!q) return all;
      const byShortcut = all.filter((r) => r.shortcut.startsWith(q));
      const byTitle = all.filter((r) => !r.shortcut.startsWith(q) && r.title.toLowerCase().includes(q));
      return [...byShortcut, ...byTitle];
    })();
    const itemCount = Math.min(8, trigger === '#' ? filteredReplies.length : filteredMembers.length);

    // Reset selected index when filtered results change
    useEffect(() => {
      setSelectedIndex(0);
    }, [itemCount, trigger]);

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

        // Find the last @ (or # with saved replies) that could be a trigger.
        // It should either be at the start or preceded by whitespace
        let atIndex = -1;
        for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
          const ch = textBeforeCursor[i];
          if (ch === '@' || (ch === '#' && savedReplies?.length)) {
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
            setTrigger(textBeforeCursor[atIndex] as '@' | '#');
            setMentionQuery(query);
            setMentionStartIndex(atIndex);
            setShowPopover(true);
            return;
          }
        }

        setShowPopover(false);
      },
      [onChange, savedReplies?.length]
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

    // Replace '#query' with the reply's text, cursor at its end.
    const handleSelectReply = useCallback(
      (reply: SavedReply) => {
        const text = renderReply ? renderReply(reply.body) : reply.body;
        const before = value.slice(0, mentionStartIndex);
        const cursorPos = textareaRef.current?.selectionStart || value.length;
        const after = value.slice(cursorPos);
        onChange(`${before}${text}${after}`);
        setShowPopover(false);
        setMentionQuery('');
        setMentionStartIndex(-1);

        requestAnimationFrame(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.focus();
            const end = before.length + text.length;
            textarea.setSelectionRange(end, end);
          }
        });
      },
      [value, mentionStartIndex, onChange, textareaRef, renderReply]
    );

    const selectAt = useCallback(
      (index: number) => {
        if (trigger === '#') {
          if (filteredReplies[index]) handleSelectReply(filteredReplies[index]);
        } else if (filteredMembers[index]) {
          handleSelectMember(filteredMembers[index]);
        }
      },
      [trigger, filteredReplies, filteredMembers, handleSelectReply, handleSelectMember]
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showPopover || itemCount === 0) {
          onKeyDown?.(e);
          return;
        }

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
            break;
          case 'Enter':
            e.preventDefault();
            selectAt(selectedIndex);
            break;
          case 'Escape':
            e.preventDefault();
            setShowPopover(false);
            break;
          case 'Tab':
            e.preventDefault();
            selectAt(selectedIndex);
            break;
        }
      },
      [showPopover, itemCount, selectedIndex, selectAt, onKeyDown]
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

        {showPopover && trigger === '#' && filteredReplies.length > 0 && (
          <div
            className="absolute left-0 z-50 w-full max-w-md rounded-md border bg-popover shadow-md"
            style={{ top: popoverPosition.top }}
          >
            <Command>
              <CommandList>
                <CommandGroup heading="Saved replies">
                  {filteredReplies.slice(0, 8).map((reply, index) => (
                    <CommandItem
                      key={reply.id}
                      onSelect={() => handleSelectReply(reply)}
                      className={cn('flex flex-col items-start gap-0.5 cursor-pointer', index === selectedIndex && 'bg-accent')}
                    >
                      <span className="text-sm">
                        <span className="font-mono text-xs text-muted-foreground">#{reply.shortcut}</span>{' '}
                        <span className="font-medium">{reply.title}</span>
                      </span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">{reply.body}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}

        {showPopover && trigger === '@' && filteredMembers.length > 0 && (
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
