/**
 * Zone API endpoints
 */

import type { GetZoneResponse, GetZonesParams, GetZonesResponse } from '../../types/api';
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
 * Get all zones with optional filtering and pagination
 */
export async function getZones(params?: GetZonesParams): Promise<GetZonesResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetZonesResponse>(`/zone${queryString}`);
}

/**
 * Get a single zone by ID
 */
export async function getZone(id: string): Promise<GetZoneResponse> {
  const client = getApiClient();
  return client.get<GetZoneResponse>(`/zone/${id}`);
}
