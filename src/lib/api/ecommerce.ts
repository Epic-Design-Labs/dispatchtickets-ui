import { apiClient } from './client';
import {
  EcommerceStore,
  EcommerceOrder,
  EcommerceOrderTicket,
  EcommerceProduct,
  ConnectStoreInput,
  LinkOrderTicketInput,
  ListOrdersParams,
  ListProductsParams,
  PaginatedResponse,
} from '@/types';

function buildParams(params?: Record<string, unknown>): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return searchParams;
}

export const ecommerceApi = {
  /** List all connected stores for a brand */
  getStores: async (brandId: string): Promise<EcommerceStore[]> => {
    const response = await apiClient.get<EcommerceStore[]>(
      `/brands/${brandId}/ecommerce/stores`
    );
    return response.data;
  },

  /** Connect a new store via OAuth */
  connectStore: async (
    brandId: string,
    data: ConnectStoreInput
  ): Promise<EcommerceStore> => {
    const response = await apiClient.post<EcommerceStore>(
      `/brands/${brandId}/ecommerce/stores/connect`,
      data
    );
    return response.data;
  },

  /** Disconnect a store */
  disconnectStore: async (brandId: string, storeId: string): Promise<void> => {
    await apiClient.delete(`/brands/${brandId}/ecommerce/stores/${storeId}`);
  },

  /** Trigger a manual sync for a store */
  triggerSync: async (brandId: string, storeId: string): Promise<void> => {
    await apiClient.post(
      `/brands/${brandId}/ecommerce/stores/${storeId}/sync`
    );
  },

  /** List orders with optional filters */
  listOrders: async (
    brandId: string,
    params?: ListOrdersParams
  ): Promise<PaginatedResponse<EcommerceOrder>> => {
    const response = await apiClient.get<PaginatedResponse<EcommerceOrder>>(
      `/brands/${brandId}/ecommerce/orders`,
      { params: buildParams(params as Record<string, unknown>) }
    );
    return response.data;
  },

  /** Get a single order by ID */
  getOrder: async (
    brandId: string,
    orderId: string
  ): Promise<EcommerceOrder> => {
    const response = await apiClient.get<EcommerceOrder>(
      `/brands/${brandId}/ecommerce/orders/${orderId}`
    );
    return response.data;
  },

  /** Get orders for a specific customer */
  getOrdersByCustomer: async (
    brandId: string,
    customerId: string
  ): Promise<EcommerceOrder[]> => {
    const response = await apiClient.get<EcommerceOrder[]>(
      `/brands/${brandId}/ecommerce/orders/by-customer/${customerId}`
    );
    return response.data;
  },

  /** Get orders linked to a specific ticket */
  getOrdersByTicket: async (
    brandId: string,
    ticketId: string
  ): Promise<EcommerceOrder[]> => {
    const response = await apiClient.get<EcommerceOrder[]>(
      `/brands/${brandId}/ecommerce/orders/by-ticket/${ticketId}`
    );
    return response.data;
  },

  /** Link an order to a ticket */
  linkOrder: async (
    brandId: string,
    orderId: string,
    data: LinkOrderTicketInput
  ): Promise<EcommerceOrderTicket> => {
    const response = await apiClient.post<EcommerceOrderTicket>(
      `/brands/${brandId}/ecommerce/orders/${orderId}/link`,
      data
    );
    return response.data;
  },

  /** Unlink an order from a ticket */
  unlinkOrder: async (
    brandId: string,
    orderId: string,
    ticketId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/brands/${brandId}/ecommerce/orders/${orderId}/link/${ticketId}`
    );
  },

  /** List products */
  listProducts: async (
    brandId: string,
    params?: ListProductsParams
  ): Promise<PaginatedResponse<EcommerceProduct>> => {
    const response = await apiClient.get<PaginatedResponse<EcommerceProduct>>(
      `/brands/${brandId}/ecommerce/products`,
      { params: buildParams(params as Record<string, unknown>) }
    );
    return response.data;
  },
};
