/**
 * Reason Template API endpoints
 */

import type { GetReasonTemplatesParams, GetReasonTemplatesResponse } from '../../types/api';
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
 * Get all reason templates with optional filtering and pagination
 */
export async function getReasonTemplates(
  params?: GetReasonTemplatesParams
): Promise<GetReasonTemplatesResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetReasonTemplatesResponse>(`/reason-template${queryString}`);
}
