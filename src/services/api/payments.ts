/**
 * Payment API endpoints
 */

import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  GetPaymentsParams,
  GetPaymentsResponse,
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
 * Create a new payment
 */
export async function createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
  const client = getApiClient();
  return client.post<CreatePaymentResponse>('/payment', request);
}

/**
 * Get all payments with optional filtering and pagination
 */
export async function getPayments(params?: GetPaymentsParams): Promise<GetPaymentsResponse> {
  const client = getApiClient();
  const queryString = params ? buildQueryString(params) : '';
  return client.get<GetPaymentsResponse>(`/payment${queryString}`);
}
