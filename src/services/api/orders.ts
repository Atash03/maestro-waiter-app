/**
 * Order API endpoints
 */

import type {
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrderResponse,
  GetOrdersParams,
  GetOrdersResponse,
  UpdateOrderRequest,
  UpdateOrderResponse,
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
 * Create a new order
 */
export async function createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
  const client = getApiClient();
  return client.post<CreateOrderResponse>('/order', request);
}

/**
 * Get all orders with optional filtering and pagination
 */
export async function getOrders(params?: GetOrdersParams): Promise<GetOrdersResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetOrdersResponse>(`/order${queryString}`);
}

/**
 * Get a single order by ID
 */
export async function getOrder(id: string): Promise<GetOrderResponse> {
  const client = getApiClient();
  return client.get<GetOrderResponse>(`/order/${id}`);
}

/**
 * Update an order
 */
export async function updateOrder(
  id: string,
  request: UpdateOrderRequest
): Promise<UpdateOrderResponse> {
  const client = getApiClient();
  return client.put<UpdateOrderResponse>(`/order/${id}`, request);
}
