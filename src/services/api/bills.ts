/**
 * Bill API endpoints
 */

import type {
  CalculateBillRequest,
  CalculateBillResponse,
  CreateBillRequest,
  CreateBillResponse,
  GetBillResponse,
  GetBillsParams,
  GetBillsResponse,
  UpdateBillDiscountsRequest,
  UpdateBillDiscountsResponse,
  UpdateBillRequest,
  UpdateBillResponse,
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
 * Create a new bill
 */
export async function createBill(request: CreateBillRequest): Promise<CreateBillResponse> {
  const client = getApiClient();
  return client.post<CreateBillResponse>('/bill', request);
}

/**
 * Get all bills with optional filtering and pagination
 */
export async function getBills(params?: GetBillsParams): Promise<GetBillsResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetBillsResponse>(`/bill${queryString}`);
}

/**
 * Get a single bill by ID
 */
export async function getBill(id: string): Promise<GetBillResponse> {
  const client = getApiClient();
  return client.get<GetBillResponse>(`/bill/${id}`);
}

/**
 * Update a bill
 */
export async function updateBill(
  id: string,
  request: UpdateBillRequest
): Promise<UpdateBillResponse> {
  const client = getApiClient();
  return client.put<UpdateBillResponse>(`/bill/${id}`, request);
}

/**
 * Update bill discounts
 */
export async function updateBillDiscounts(
  id: string,
  request: UpdateBillDiscountsRequest
): Promise<UpdateBillDiscountsResponse> {
  const client = getApiClient();
  return client.put<UpdateBillDiscountsResponse>(`/bill/${id}/discounts`, request);
}

/**
 * Calculate bill totals (preview)
 */
export async function calculateBill(request: CalculateBillRequest): Promise<CalculateBillResponse> {
  const client = getApiClient();
  return client.post<CalculateBillResponse>('/bill/calculate', request);
}
