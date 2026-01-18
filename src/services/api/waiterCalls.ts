/**
 * Waiter Call API endpoints
 */

import type {
  AcknowledgeWaiterCallResponse,
  CancelWaiterCallResponse,
  CompleteWaiterCallResponse,
  CreateWaiterCallRequest,
  CreateWaiterCallResponse,
  GetWaiterCallResponse,
  GetWaiterCallsParams,
  GetWaiterCallsResponse,
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
 * Create a waiter call (public endpoint)
 */
export async function createWaiterCall(
  request: CreateWaiterCallRequest
): Promise<CreateWaiterCallResponse> {
  const client = getApiClient();
  return client.post<CreateWaiterCallResponse>('/waiter-call', request);
}

/**
 * Get all waiter calls with optional filtering and pagination
 */
export async function getWaiterCalls(
  params?: GetWaiterCallsParams
): Promise<GetWaiterCallsResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetWaiterCallsResponse>(`/waiter-call${queryString}`);
}

/**
 * Get a single waiter call by ID
 */
export async function getWaiterCall(id: string): Promise<GetWaiterCallResponse> {
  const client = getApiClient();
  return client.get<GetWaiterCallResponse>(`/waiter-call/${id}`);
}

/**
 * Acknowledge a waiter call
 */
export async function acknowledgeWaiterCall(id: string): Promise<AcknowledgeWaiterCallResponse> {
  const client = getApiClient();
  return client.put<AcknowledgeWaiterCallResponse>(`/waiter-call/${id}/acknowledge`);
}

/**
 * Complete a waiter call
 */
export async function completeWaiterCall(id: string): Promise<CompleteWaiterCallResponse> {
  const client = getApiClient();
  return client.put<CompleteWaiterCallResponse>(`/waiter-call/${id}/complete`);
}

/**
 * Cancel a waiter call
 */
export async function cancelWaiterCall(id: string): Promise<CancelWaiterCallResponse> {
  const client = getApiClient();
  return client.put<CancelWaiterCallResponse>(`/waiter-call/${id}/cancel`);
}
