'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ecommerceApi } from '@/lib/api';
import { ConnectStoreInput, LinkOrderTicketInput, ListOrdersParams } from '@/types';

export const ecommerceKeys = {
  all: (brandId: string) => ['ecommerce', brandId] as const,
  stores: (brandId: string) => ['ecommerce', brandId, 'stores'] as const,
  orders: (brandId: string, params?: ListOrdersParams) =>
    ['ecommerce', brandId, 'orders', params] as const,
  orderDetail: (brandId: string, orderId: string) =>
    ['ecommerce', brandId, 'orders', orderId] as const,
  customerOrders: (brandId: string, customerId: string) =>
    ['ecommerce', brandId, 'customer-orders', customerId] as const,
  ticketOrders: (brandId: string, ticketId: string) =>
    ['ecommerce', brandId, 'ticket-orders', ticketId] as const,
  products: (brandId: string, params?: Record<string, unknown>) =>
    ['ecommerce', brandId, 'products', params] as const,
};

export function useStores(brandId: string) {
  return useQuery({
    queryKey: ecommerceKeys.stores(brandId),
    queryFn: () => ecommerceApi.getStores(brandId),
    enabled: !!brandId,
  });
}

export function useConnectStore(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConnectStoreInput) =>
      ecommerceApi.connectStore(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.stores(brandId) });
    },
  });
}

export function useDisconnectStore(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeId: string) =>
      ecommerceApi.disconnectStore(brandId, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.all(brandId) });
    },
  });
}

export function useTriggerSync(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeId: string) =>
      ecommerceApi.triggerSync(brandId, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.stores(brandId) });
    },
  });
}

export function useOrders(brandId: string, params?: ListOrdersParams) {
  return useQuery({
    queryKey: ecommerceKeys.orders(brandId, params),
    queryFn: () => ecommerceApi.listOrders(brandId, params),
    enabled: !!brandId,
  });
}

export function useCustomerOrders(brandId: string, customerId: string) {
  return useQuery({
    queryKey: ecommerceKeys.customerOrders(brandId, customerId),
    queryFn: () => ecommerceApi.getOrdersByCustomer(brandId, customerId),
    enabled: !!brandId && !!customerId,
  });
}

export function useTicketOrders(brandId: string, ticketId: string) {
  return useQuery({
    queryKey: ecommerceKeys.ticketOrders(brandId, ticketId),
    queryFn: () => ecommerceApi.getOrdersByTicket(brandId, ticketId),
    enabled: !!brandId && !!ticketId,
  });
}

export function useLinkOrder(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: LinkOrderTicketInput;
    }) => ecommerceApi.linkOrder(brandId, orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.all(brandId) });
    },
  });
}

export function useUnlinkOrder(brandId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, ticketId }: { orderId: string; ticketId: string }) =>
      ecommerceApi.unlinkOrder(brandId, orderId, ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.all(brandId) });
    },
  });
}
