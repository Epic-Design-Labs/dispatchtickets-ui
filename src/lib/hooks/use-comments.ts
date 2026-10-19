'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '@/lib/api';
import { CreateCommentInput, UpdateCommentInput, Comment } from '@/types';
import { ticketKeys } from './use-tickets';

export const commentKeys = {
  all: (brandId: string, ticketId: string) =>
    ['comments', brandId, ticketId] as const,
};

export function useComments(
  brandId: string,
  ticketId: string,
  options?: { polling?: boolean; live?: boolean },
) {
  return useQuery({
    queryKey: commentKeys.all(brandId, ticketId),
    queryFn: () => commentsApi.list(brandId, ticketId),
    enabled: !!brandId && !!ticketId,
    // Poll every 10 seconds when viewing a ticket; every 3 on a live chat,
    // where 10 seconds is long enough to read as being ignored.
    refetchInterval: options?.polling ? (options.live ? 3000 : 10000) : false,
    refetchIntervalInBackground: false, // Don't poll when tab is not focused
  });
}

export function useCreateComment(brandId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentInput) =>
      commentsApi.create(brandId, ticketId, data),
    onSuccess: (newComment) => {
      // Optimistic update for comments
      queryClient.setQueryData<Comment[]>(
        commentKeys.all(brandId, ticketId),
        (old) => (old ? [...old, newComment] : [newComment])
      );
      queryClient.invalidateQueries({
        queryKey: commentKeys.all(brandId, ticketId),
      });
      // Also invalidate the ticket since comments can change status/assignee
      queryClient.invalidateQueries({
        queryKey: ticketKeys.detail(brandId, ticketId),
      });
      // And the ticket list (for status badge updates)
      queryClient.invalidateQueries({
        queryKey: ticketKeys.all(brandId),
      });
    },
  });
}

export function useUpdateComment(
  brandId: string,
  ticketId: string,
  commentId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCommentInput) =>
      commentsApi.update(brandId, ticketId, commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.all(brandId, ticketId),
      });
    },
  });
}

export function useDeleteComment(brandId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      commentsApi.delete(brandId, ticketId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.all(brandId, ticketId),
      });
    },
  });
}
