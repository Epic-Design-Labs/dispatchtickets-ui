export type EcommercePlatform = 'BIGCOMMERCE' | 'SHOPIFY' | 'WOOCOMMERCE';

export type EcommerceStoreStatus =
  | 'PENDING_SETUP'
  | 'SYNCING'
  | 'ACTIVE'
  | 'ERROR'
  | 'DISCONNECTED';

export type EcommerceOrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DISPUTED';

export type EcommerceOrderTicketLinkType = 'MANUAL' | 'AUTOMATIC' | 'API';

export interface EcommerceStore {
  id: string;
  brandId: string;
  name: string;
  platform: EcommercePlatform;
  storeUrl: string;
  storeId: string;
  status: EcommerceStoreStatus;
  lastSyncAt: string | null;
  errorMessage: string | null;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EcommerceOrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  platformProductId: string | null;
  platformVariantId: string | null;
  name: string;
  sku: string | null;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  discount: string;
  fulfillmentStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EcommerceOrderTicket {
  id: string;
  orderId: string;
  ticketId: string;
  linkType: EcommerceOrderTicketLinkType;
  createdBy: string | null;
  createdAt: string;
}

export interface EcommerceOrder {
  id: string;
  storeId: string;
  brandId: string;
  platformOrderId: string;
  orderNumber: string;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  status: EcommerceOrderStatus;
  platformStatus: string | null;
  currency: string;
  subtotal: string;
  shippingTotal: string;
  taxTotal: string;
  discountTotal: string;
  total: string;
  refundTotal: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  fulfillmentStatus: string | null;
  shippingMethod: string | null;
  platformCreatedAt: string | null;
  platformUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: EcommerceOrderItem[];
  store?: EcommerceStore;
  tickets?: EcommerceOrderTicket[];
}

export interface EcommerceProduct {
  id: string;
  storeId: string;
  brandId: string;
  platformProductId: string;
  name: string;
  sku: string | null;
  description: string | null;
  imageUrl: string | null;
  price: string;
  currency: string;
  isActive: boolean;
  productType: string | null;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConnectStoreInput {
  platform: EcommercePlatform;
  /** OAuth flow */
  code?: string;
  redirectUri?: string;
  /** Direct API token flow */
  accessToken?: string;
  storeHash?: string;
}

export interface LinkOrderTicketInput {
  ticketId: string;
  linkType?: EcommerceOrderTicketLinkType;
}

export interface ListOrdersParams {
  status?: EcommerceOrderStatus;
  customerId?: string;
  search?: string;
  storeId?: string;
  cursor?: string;
  limit?: number;
}

export interface ListProductsParams {
  storeId?: string;
  search?: string;
  isActive?: boolean;
  cursor?: string;
  limit?: number;
}
