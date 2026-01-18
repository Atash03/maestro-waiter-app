/**
 * Customer API endpoints
 */

import type {
  GetCustomerResponse,
  GetCustomersParams,
  GetCustomersResponse,
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
 * Get all customers with optional filtering and pagination
 */
export async function getCustomers(params?: GetCustomersParams): Promise<GetCustomersResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetCustomersResponse>(`/customer${queryString}`);
}

/**
 * Get a single customer by ID
 */
export async function getCustomer(id: string): Promise<GetCustomerResponse> {
  const client = getApiClient();
  return client.get<GetCustomerResponse>(`/customer/${id}`);
}
