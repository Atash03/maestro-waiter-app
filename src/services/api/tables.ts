/**
 * Table API endpoints
 */

import type { GetTableResponse, GetTablesParams, GetTablesResponse } from '../../types/api';
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
 * Get all tables with optional filtering and pagination
 */
export async function getTables(params?: GetTablesParams): Promise<GetTablesResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetTablesResponse>(`/table${queryString}`);
}

/**
 * Get a single table by ID
 */
export async function getTable(id: string): Promise<GetTableResponse> {
  const client = getApiClient();
  return client.get<GetTableResponse>(`/table/${id}`);
}
