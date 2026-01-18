/**
 * Extra (add-ons) API endpoints
 */

import type { GetExtraResponse, GetExtrasParams, GetExtrasResponse } from '../../types/api';
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
 * Get all extras with optional filtering and pagination
 */
export async function getExtras(params?: GetExtrasParams): Promise<GetExtrasResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetExtrasResponse>(`/extra${queryString}`);
}

/**
 * Get a single extra by ID
 */
export async function getExtra(id: string): Promise<GetExtraResponse> {
  const client = getApiClient();
  return client.get<GetExtraResponse>(`/extra/${id}`);
}
