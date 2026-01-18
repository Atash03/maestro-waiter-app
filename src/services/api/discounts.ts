/**
 * Discount API endpoints
 */

import type {
  CalculateDiscountsRequest,
  CalculateDiscountsResponse,
  GetDiscountResponse,
  GetDiscountsParams,
  GetDiscountsResponse,
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
 * Get all discounts with optional filtering and pagination
 */
export async function getDiscounts(params?: GetDiscountsParams): Promise<GetDiscountsResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetDiscountsResponse>(`/discount${queryString}`);
}

/**
 * Get a single discount by ID
 */
export async function getDiscount(id: string): Promise<GetDiscountResponse> {
  const client = getApiClient();
  return client.get<GetDiscountResponse>(`/discount/${id}`);
}

/**
 * Calculate discounts for a bill
 */
export async function calculateDiscounts(
  request: CalculateDiscountsRequest
): Promise<CalculateDiscountsResponse> {
  const client = getApiClient();
  return client.post<CalculateDiscountsResponse>('/discount/calculate', request);
}
