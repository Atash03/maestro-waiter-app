/**
 * Authentication API endpoints
 */

import type { CheckSessionResponse, LoginRequest, LoginResponse } from '../../types/api';
import { getApiClient } from './client';

/**
 * Login with username and password
 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  const client = getApiClient();
  return client.post<LoginResponse>('/auth/login', request);
}

/**
 * Check if the current session is valid
 * Returns the account info if valid
 */
export async function checkSession(): Promise<CheckSessionResponse> {
  const client = getApiClient();
  return client.get<CheckSessionResponse>('/auth/check');
}

/**
 * Logout and invalidate the current session
 */
export async function logout(): Promise<void> {
  const client = getApiClient();
  return client.post<void>('/auth/logout');
}
