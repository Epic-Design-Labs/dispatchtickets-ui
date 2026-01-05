import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentsApi, Attachment, AttachmentWithUrl } from '../api/attachments';

export const attachmentKeys = {
  all: ['attachments'] as const,
  list: (brandId: string, ticketId: string) =>
    [...attachmentKeys.all, 'list', brandId, ticketId] as const,
  detail: (brandId: string, ticketId: string, attachmentId: string) =>
    [...attachmentKeys.all, 'detail', brandId, ticketId, attachmentId] as const,
};

/**
 * Hook to fetch all attachments for a ticket
 */
export function useAttachments(brandId: string, ticketId: string) {
  return useQuery({
    queryKey: attachmentKeys.list(brandId, ticketId),
    queryFn: () => attachmentsApi.list(brandId, ticketId),
    enabled: !!brandId && !!ticketId,
  });
}

/**
 * Hook to fetch a single attachment with download URL
 */
export function useAttachment(
  brandId: string,
  ticketId: string,
  attachmentId: string
) {
  return useQuery({
    queryKey: attachmentKeys.detail(brandId, ticketId, attachmentId),
    queryFn: () => attachmentsApi.get(brandId, ticketId, attachmentId),
    enabled: !!brandId && !!ticketId && !!attachmentId,
  });
}

/**
 * Hook to upload an attachment
 */
export function useUploadAttachment(brandId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) =>
      attachmentsApi.uploadFile(brandId, ticketId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attachmentKeys.list(brandId, ticketId),
      });
    },
  });
}

/**
 * Hook to delete an attachment
 */
export function useDeleteAttachment(brandId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: string) =>
      attachmentsApi.delete(brandId, ticketId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attachmentKeys.list(brandId, ticketId),
      });
    },
  });
}
