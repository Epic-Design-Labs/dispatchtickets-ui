import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentsApi, Attachment, AttachmentWithUrl, AttachmentUrlsResponse } from '../api/attachments';

export const attachmentKeys = {
  all: ['attachments'] as const,
  list: (brandId: string, ticketId: string) =>
    [...attachmentKeys.all, 'list', brandId, ticketId] as const,
  detail: (brandId: string, ticketId: string, attachmentId: string) =>
    [...attachmentKeys.all, 'detail', brandId, ticketId, attachmentId] as const,
  urls: (brandId: string, attachmentIds: string[]) =>
    [...attachmentKeys.all, 'urls', brandId, ...attachmentIds.sort()] as const,
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

/**
 * Hook to fetch fresh download URLs for multiple attachments
 * URLs are cached for 30 minutes (half of the 1-hour presigned URL validity)
 */
export function useAttachmentUrls(
  brandId: string | undefined,
  attachmentIds: string[]
) {
  return useQuery({
    queryKey: attachmentKeys.urls(brandId || '', attachmentIds),
    queryFn: () => attachmentsApi.getUrls(brandId!, attachmentIds),
    enabled: !!brandId && attachmentIds.length > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes - URLs are valid for 1 hour
    gcTime: 45 * 60 * 1000, // Keep in cache for 45 minutes
  });
}

/**
 * Hook to upload pending attachments (before ticket creation)
 * Returns the attachment to be associated when the ticket is created
 */
export function useUploadPendingAttachment(brandId: string) {
  return useMutation({
    mutationFn: (file: File) => attachmentsApi.uploadPendingFile(brandId, file),
  });
}
