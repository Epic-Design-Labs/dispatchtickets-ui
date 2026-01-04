import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi, CreateFormTokenDto, UpdateFormTokenDto } from '@/lib/api/forms';

export function useForms(brandId: string) {
  return useQuery({
    queryKey: ['forms', brandId],
    queryFn: () => formsApi.list(brandId),
    enabled: !!brandId,
  });
}

export function useForm(brandId: string, formId: string) {
  return useQuery({
    queryKey: ['forms', brandId, formId],
    queryFn: () => formsApi.get(brandId, formId),
    enabled: !!brandId && !!formId,
  });
}

export function useCreateForm(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFormTokenDto) =>
      formsApi.create(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', brandId] });
    },
  });
}

export function useUpdateForm(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ formId, data }: { formId: string; data: UpdateFormTokenDto }) =>
      formsApi.update(brandId, formId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', brandId] });
    },
  });
}

export function useDeleteForm(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formId: string) => formsApi.delete(brandId, formId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', brandId] });
    },
  });
}

export function useRegenerateFormToken(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formId: string) => formsApi.regenerateToken(brandId, formId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', brandId] });
    },
  });
}
