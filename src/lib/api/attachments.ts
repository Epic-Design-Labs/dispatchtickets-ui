import { apiClient } from './client';

export interface Attachment {
  id: string;
  ticketId: string;
  filename: string;
  contentType: string;
  size: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentWithUrl extends Attachment {
  downloadUrl: string;
}

export interface InitiateUploadResponse {
  id: string;
  uploadUrl: string;
  filename: string;
}

export interface CreateAttachmentDto {
  filename: string;
  contentType: string;
  size: number;
}

export const attachmentsApi = {
  /**
   * Initiate an upload - get presigned URL
   */
  initiateUpload: async (
    brandId: string,
    ticketId: string,
    dto: CreateAttachmentDto
  ): Promise<InitiateUploadResponse> => {
    const response = await apiClient.post<InitiateUploadResponse>(
      `/brands/${brandId}/tickets/${ticketId}/attachments`,
      dto
    );
    return response.data;
  },

  /**
   * Confirm upload completed
   */
  confirmUpload: async (
    brandId: string,
    ticketId: string,
    attachmentId: string
  ): Promise<Attachment> => {
    const response = await apiClient.post<Attachment>(
      `/brands/${brandId}/tickets/${ticketId}/attachments/${attachmentId}/confirm`
    );
    return response.data;
  },

  /**
   * List attachments on a ticket
   */
  list: async (brandId: string, ticketId: string): Promise<Attachment[]> => {
    const response = await apiClient.get<Attachment[]>(
      `/brands/${brandId}/tickets/${ticketId}/attachments`
    );
    return response.data;
  },

  /**
   * Get attachment with download URL
   */
  get: async (
    brandId: string,
    ticketId: string,
    attachmentId: string
  ): Promise<AttachmentWithUrl> => {
    const response = await apiClient.get<AttachmentWithUrl>(
      `/brands/${brandId}/tickets/${ticketId}/attachments/${attachmentId}`
    );
    return response.data;
  },

  /**
   * Delete an attachment
   */
  delete: async (
    brandId: string,
    ticketId: string,
    attachmentId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/brands/${brandId}/tickets/${ticketId}/attachments/${attachmentId}`
    );
  },

  /**
   * Upload a file - convenience method that handles the full flow
   */
  uploadFile: async (
    brandId: string,
    ticketId: string,
    file: File
  ): Promise<AttachmentWithUrl> => {
    // 1. Initiate upload to get presigned URL
    const { id, uploadUrl } = await attachmentsApi.initiateUpload(
      brandId,
      ticketId,
      {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }
    );

    // 2. Upload directly to S3/R2
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    // 3. Confirm upload and get download URL
    await attachmentsApi.confirmUpload(brandId, ticketId, id);

    // 4. Get the attachment with download URL
    return attachmentsApi.get(brandId, ticketId, id);
  },
};
