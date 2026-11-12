'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { brandColor, brandInitials } from '@/lib/brand-visual';
import { readableTextOn } from '@/lib/soft-color';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
} as const;

export type PersonAvatarSize = keyof typeof SIZES;

interface PersonAvatarProps {
  /** What appears beside the avatar. Also what picks the colour. */
  name: string;
  /** An uploaded picture or a gravatar, when there is one. */
  imageUrl?: string;
  /**
   * Dispatch itself rather than a person -- a quiet grey circle, because a
   * rainbow colour implies someone to reply to.
   */
  system?: boolean;
  size?: PersonAvatarSize;
  className?: string;
}

/**
 * The circle that stands in for a person: an agent, a contact, a sender.
 *
 * The colour is derived from the name, the same way a brand's tile is, so one
 * person keeps one colour everywhere they appear and two people in a thread
 * are told apart at a glance. The text colour is MEASURED against that fill
 * rather than assumed white -- three of the ten palette entries (amber, teal,
 * emerald) fail contrast under white text.
 */
export function PersonAvatar({ name, imageUrl, system = false, size = 'md', className }: PersonAvatarProps) {
  const background = system ? null : brandColor(name);

  return (
    <Avatar className={cn(SIZES[size], className)}>
      <AvatarImage src={imageUrl} alt={name} />
      <AvatarFallback
        className={cn('font-semibold', system && 'bg-secondary text-muted-foreground')}
        style={background ? { backgroundColor: background, color: readableTextOn(background) } : undefined}
      >
        {brandInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
