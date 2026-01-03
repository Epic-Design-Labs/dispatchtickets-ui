import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi, CreateFormTokenDto, UpdateFormTokenDto } from '@/lib/api/forms';

export function useForms(workspaceId: string) {
  return useQuery({
    queryKey: ['forms', workspaceId],
    queryFn: () => formsApi.list(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useForm(workspaceId: string, formId: string) {
  return useQuery({
    queryKey: ['forms', workspaceId, formId],
    queryFn: () => formsApi.get(workspaceId, formId),
    enabled: !!workspaceId && !!formId,
  });
}

export function useCreateForm(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFormTokenDto) =>
      formsApi.create(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
    },
  });
}

export function useUpdateForm(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ formId, data }: { formId: string; data: UpdateFormTokenDto }) =>
      formsApi.update(workspaceId, formId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
    },
  });
}

export function useDeleteForm(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formId: string) => formsApi.delete(workspaceId, formId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
    },
  });
}

export function useRegenerateFormToken(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formId: string) => formsApi.regenerateToken(workspaceId, formId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
    },
  });
}
