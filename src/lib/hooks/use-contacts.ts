'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '@/lib/api';
import { CreateContactInput, UpdateContactInput } from '@/types';

export const contactKeys = {
  all: (brandId: string) => ['contacts', brandId] as const,
  list: (brandId: string, params?: { search?: string; companyId?: string }) =>
    ['contacts', brandId, 'list', params] as const,
  detail: (brandId: string, contactId: string) =>
    ['contacts', brandId, contactId] as const,
  search: (brandId: string, query: string) =>
    ['contacts', brandId, 'search', query] as const,
};

export function useContacts(
  brandId: string,
  params?: { search?: string; companyId?: string }
) {
  return useQuery({
    queryKey: contactKeys.list(brandId, params),
    queryFn: () => contactsApi.list(brandId, params),
    enabled: !!brandId,
  });
}

export function useContact(brandId: string, contactId: string) {
  return useQuery({
    queryKey: contactKeys.detail(brandId, contactId),
    queryFn: () => contactsApi.get(brandId, contactId),
    enabled: !!brandId && !!contactId,
  });
}

export function useContactSearch(brandId: string, query: string) {
  return useQuery({
    queryKey: contactKeys.search(brandId, query),
    queryFn: () => contactsApi.search(brandId, query),
    enabled: !!brandId && query.length >= 2,
  });
}

export function useCreateContact(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContactInput) =>
      contactsApi.create(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all(brandId) });
    },
  });
}

export function useUpdateContact(brandId: string, contactId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateContactInput) =>
      contactsApi.update(brandId, contactId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all(brandId) });
      queryClient.invalidateQueries({
        queryKey: contactKeys.detail(brandId, contactId),
      });
      // Also invalidate ticket queries since contact data is embedded in tickets
      queryClient.invalidateQueries({ queryKey: ['tickets', brandId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tickets'] });
    },
  });
}

export function useDeleteContact(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) =>
      contactsApi.delete(brandId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all(brandId) });
    },
  });
}
