'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '@/lib/api';
import { CreateCommentInput, UpdateCommentInput, Comment } from '@/types';

export const commentKeys = {
  all: (workspaceId: string, ticketId: string) =>
    ['comments', workspaceId, ticketId] as const,
};

export function useComments(workspaceId: string, ticketId: string) {
  return useQuery({
    queryKey: commentKeys.all(workspaceId, ticketId),
    queryFn: () => commentsApi.list(workspaceId, ticketId),
    enabled: !!workspaceId && !!ticketId,
  });
}

export function useCreateComment(workspaceId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentInput) =>
      commentsApi.create(workspaceId, ticketId, data),
    onSuccess: (newComment) => {
      // Optimistic update
      queryClient.setQueryData<Comment[]>(
        commentKeys.all(workspaceId, ticketId),
        (old) => (old ? [...old, newComment] : [newComment])
      );
      queryClient.invalidateQueries({
        queryKey: commentKeys.all(workspaceId, ticketId),
      });
    },
  });
}

export function useUpdateComment(
  workspaceId: string,
  ticketId: string,
  commentId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCommentInput) =>
      commentsApi.update(workspaceId, ticketId, commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.all(workspaceId, ticketId),
      });
    },
  });
}

export function useDeleteComment(workspaceId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      commentsApi.delete(workspaceId, ticketId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.all(workspaceId, ticketId),
      });
    },
  });
}
