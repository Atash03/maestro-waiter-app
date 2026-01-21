/**
 * API Client for the Maestro Waiter App
 *
 * Features:
 * - Configurable base URL and default headers
 * - Request/response interceptors
 * - Automatic session header injection
 * - 401 (unauthorized) handling with navigation to login
 * - 403 (forbidden) handling with appropriate error messages
 * - Retry logic for network failures
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { Platform } from 'react-native';
import type { ApiError } from '../../types/api';
import { DevicePlatform, DeviceType } from '../../types/enums';

// Configuration constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay
const RETRYABLE_STATUS_CODES = [408, 500, 502, 503, 504];

/**
 * Configuration for the API client
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Session and device info for authenticated requests
 */
export interface SessionInfo {
  sessionId: string;
  deviceId: string;
  deviceType: DeviceType;
  devicePlatform: DevicePlatform;
  deviceName?: string;
  appVersion?: string;
}

/**
 * Callback type for handling authentication errors
 */
export type AuthErrorCallback = () => void;

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly isRetryable: boolean;

  constructor(message: string, status: number, code: string, isRetryable = false) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

/**
 * API Client class for making HTTP requests to the Maestro backend
 */
export class ApiClient {
  private readonly client: AxiosInstance;
  private sessionInfo: SessionInfo | null = null;
  private _onUnauthorized: AuthErrorCallback | null = null;
  private _onForbidden: ((message: string) => void) | null = null;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(config: ApiClientConfig) {
    this.maxRetries = config.maxRetries ?? MAX_RETRIES;
    this.retryDelay = config.retryDelay ?? RETRY_DELAY;

    console.log('config', config);

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set session info for authenticated requests
   */
  public setSessionInfo(sessionInfo: SessionInfo | null): void {
    this.sessionInfo = sessionInfo;
  }

  /**
   * Get current session info
   */
  public getSessionInfo(): SessionInfo | null {
    return this.sessionInfo;
  }

  /**
   * Get/Set callback for 401 (unauthorized) errors
   */
  public get onUnauthorized(): AuthErrorCallback | null {
    return this._onUnauthorized;
  }

  public set onUnauthorized(callback: AuthErrorCallback | null) {
    this._onUnauthorized = callback;
  }

  /**
   * Get/Set callback for 403 (forbidden) errors
   */
  public get onForbidden(): ((message: string) => void) | null {
    return this._onForbidden;
  }

  public set onForbidden(callback: ((message: string) => void) | null) {
    this._onForbidden = callback;
  }

  /**
   * Set callback for 401 (unauthorized) errors
   * @deprecated Use onUnauthorized property setter instead
   */
  public setOnUnauthorized(callback: AuthErrorCallback | null): void {
    this._onUnauthorized = callback;
  }

  /**
   * Set callback for 403 (forbidden) errors
   * @deprecated Use onForbidden property setter instead
   */
  public setOnForbidden(callback: ((message: string) => void) | null): void {
    this._onForbidden = callback;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - inject session and device headers
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.sessionInfo) {
          config.headers.set('maestro-session-id', this.sessionInfo.sessionId);
          config.headers.set('x-device-id', this.sessionInfo.deviceId);
          config.headers.set('x-device-type', this.sessionInfo.deviceType);
          config.headers.set('x-device-platform', this.sessionInfo.devicePlatform);

          if (this.sessionInfo.deviceName) {
            config.headers.set('x-device-name', this.sessionInfo.deviceName);
          }

          if (this.sessionInfo.appVersion) {
            config.headers.set('x-app-version', this.sessionInfo.appVersion);
          }
        }

        return config;
      },
      (error: AxiosError<ApiError>) => {
        return Promise.reject(this.transformError(error));
      }
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError<ApiError>) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message || 'An error occurred';

        // Handle 401 - Unauthorized
        if (status === 401) {
          this.sessionInfo = null;
          if (this._onUnauthorized) {
            this._onUnauthorized();
          }
          return Promise.reject(new ApiClientError(message, 401, 'UNAUTHORIZED', false));
        }

        // Handle 403 - Forbidden
        if (status === 403) {
          if (this._onForbidden) {
            this._onForbidden(message);
          }
          return Promise.reject(new ApiClientError(message, 403, 'FORBIDDEN', false));
        }

        return Promise.reject(this.transformError(error));
      }
    );
  }

  /**
   * Transform axios error to ApiClientError
   */
  private transformError(error: AxiosError<ApiError>): ApiClientError {
    const status = error.response?.status || 0;
    const message = error.response?.data?.message || error.message || 'An error occurred';

    // Determine error code
    let code = 'UNKNOWN_ERROR';
    if (error.code === 'ECONNABORTED') {
      code = 'TIMEOUT';
    } else if (error.code === 'ERR_NETWORK' || !error.response) {
      code = 'NETWORK_ERROR';
    } else if (status >= 400 && status < 500) {
      code = 'CLIENT_ERROR';
    } else if (status >= 500) {
      code = 'SERVER_ERROR';
    }

    // Determine if error is retryable
    const isRetryable =
      code === 'NETWORK_ERROR' || code === 'TIMEOUT' || RETRYABLE_STATUS_CODES.includes(status);

    return new ApiClientError(message, status, code, isRetryable);
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retryCount = 0
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      if (error instanceof ApiClientError && error.isRetryable && retryCount < this.maxRetries) {
        // Exponential backoff with jitter
        const delay = this.retryDelay * 2 ** retryCount + Math.random() * 100;
        await this.sleep(delay);
        return this.executeWithRetry(requestFn, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Sleep utility for retry delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.executeWithRetry(() => this.client.get<T>(url, config));
    return response.data;
  }

  /**
   * POST request
   */
  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.executeWithRetry(() => this.client.post<T>(url, data, config));
    return response.data;
  }

  /**
   * PUT request
   */
  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.executeWithRetry(() => this.client.put<T>(url, data, config));
    return response.data;
  }

  /**
   * PATCH request
   */
  public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.executeWithRetry(() => this.client.patch<T>(url, data, config));
    return response.data;
  }

  /**
   * DELETE request
   */
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.executeWithRetry(() => this.client.delete<T>(url, config));
    return response.data;
  }
}

/**
 * Get the device platform based on React Native's Platform
 */
export function getDevicePlatform(): DevicePlatform {
  switch (Platform.OS) {
    case 'ios':
      return DevicePlatform.IOS;
    case 'android':
      return DevicePlatform.ANDROID;
    case 'macos':
      return DevicePlatform.MACOS;
    case 'windows':
      return DevicePlatform.WINDOWS;
    case 'web':
      return DevicePlatform.WEB;
    default:
      return DevicePlatform.WEB;
  }
}

/**
 * Get the device type based on the platform
 */
export function getDeviceType(): DeviceType {
  const platform = Platform.OS;
  if (platform === 'ios' || platform === 'android') {
    return DeviceType.MOBILE;
  }
  return DeviceType.DESKTOP;
}

// Default API configuration
const DEFAULT_BASE_URL = 'http://ybady.com.tm/maestro/api/v1';

// Singleton instance
let apiClientInstance: ApiClient | null = null;

/**
 * Initialize the API client with configuration
 */
export function initializeApiClient(config?: Partial<ApiClientConfig>): ApiClient {
  apiClientInstance = new ApiClient({
    baseURL: config?.baseURL ?? DEFAULT_BASE_URL,
    timeout: config?.timeout,
    maxRetries: config?.maxRetries,
    retryDelay: config?.retryDelay,
  });
  return apiClientInstance;
}

/**
 * Get the API client instance
 * Throws if not initialized
 */
export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    throw new Error('API client not initialized. Call initializeApiClient() first.');
  }
  return apiClientInstance;
}

/**
 * Check if API client is initialized
 */
export function isApiClientInitialized(): boolean {
  return apiClientInstance !== null;
}

/**
 * Reset the API client instance (useful for testing)
 */
export function resetApiClient(): void {
  apiClientInstance = null;
}
