/**
 * Order Item API endpoints
 */

import type {
  BatchCreateOrderItemsRequest,
  BatchCreateOrderItemsResponse,
  BatchUpdateOrderItemStatusRequest,
  BatchUpdateOrderItemStatusResponse,
  CreateOrderItemRequest,
  CreateOrderItemResponse,
  GetOrderItemResponse,
  GetOrderItemsParams,
  GetOrderItemsResponse,
  KitchenViewResponse,
  UpdateOrderItemRequest,
  UpdateOrderItemResponse,
} from '../../types/api';
import { getApiClient } from './client';

/**
 * Build query string from params object
 */
function buildQueryString<T extends object>(params: T): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Create a single order item
 */
export async function createOrderItem(
  request: CreateOrderItemRequest
): Promise<CreateOrderItemResponse> {
  const client = getApiClient();
  return client.post<CreateOrderItemResponse>('/order-item', request);
}

/**
 * Create multiple order items in batch
 */
export async function batchCreateOrderItems(
  request: BatchCreateOrderItemsRequest
): Promise<BatchCreateOrderItemsResponse> {
  const client = getApiClient();
  return client.post<BatchCreateOrderItemsResponse>('/order-item/batch', request);
}

/**
 * Get all order items with optional filtering and pagination
 */
export async function getOrderItems(params?: GetOrderItemsParams): Promise<GetOrderItemsResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetOrderItemsResponse>(`/order-item${queryString}`);
}

/**
 * Get a single order item by ID
 */
export async function getOrderItem(id: string): Promise<GetOrderItemResponse> {
  const client = getApiClient();
  return client.get<GetOrderItemResponse>(`/order-item/${id}`);
}

/**
 * Update a single order item
 */
export async function updateOrderItem(
  id: string,
  request: UpdateOrderItemRequest
): Promise<UpdateOrderItemResponse> {
  const client = getApiClient();
  return client.put<UpdateOrderItemResponse>(`/order-item/${id}`, request);
}

/**
 * Batch update order item status
 */
export async function batchUpdateOrderItemStatus(
  request: BatchUpdateOrderItemStatusRequest
): Promise<BatchUpdateOrderItemStatusResponse> {
  const client = getApiClient();
  return client.patch<BatchUpdateOrderItemStatusResponse>('/order-item/batch/status', request);
}

/**
 * Get kitchen view with items grouped by status
 */
export async function getKitchenView(): Promise<KitchenViewResponse> {
  const client = getApiClient();
  return client.get<KitchenViewResponse>('/order-item/kitchen/view');
}
