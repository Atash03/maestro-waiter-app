/**
 * Tests for the API client
 */

import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import {
  ApiClient,
  ApiClientError,
  getApiClient,
  getDevicePlatform,
  getDeviceType,
  initializeApiClient,
  isApiClientInitialized,
  resetApiClient,
  type SessionInfo,
} from '../services/api/client';
import { DevicePlatform, DeviceType } from '../types/enums';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('ApiClient', () => {
  let mockAxiosInstance: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
    interceptors: {
      request: { use: jest.Mock };
      response: { use: jest.Mock };
    };
  };

  let requestInterceptor: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  let responseErrorInterceptor: (error: AxiosError) => Promise<never>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetApiClient();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(
      mockAxiosInstance as unknown as ReturnType<typeof axios.create>
    );

    // Capture interceptors when they're set up
    mockAxiosInstance.interceptors.request.use.mockImplementation(
      (onFulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig) => {
        requestInterceptor = onFulfilled;
      }
    );

    mockAxiosInstance.interceptors.response.use.mockImplementation(
      (_onFulfilled: unknown, onRejected: (error: AxiosError) => Promise<never>) => {
        responseErrorInterceptor = onRejected;
      }
    );
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      new ApiClient({
        baseURL: 'https://api.example.com',
        timeout: 5000,
      });

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should use default timeout if not provided', () => {
      new ApiClient({
        baseURL: 'https://api.example.com',
      });

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.example.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should set up request and response interceptors', () => {
      new ApiClient({
        baseURL: 'https://api.example.com',
      });

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('session management', () => {
    it('should set and get session info', () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const sessionInfo: SessionInfo = {
        sessionId: 'test-session-id',
        deviceId: 'test-device-id',
        deviceType: DeviceType.MOBILE,
        devicePlatform: DevicePlatform.IOS,
        deviceName: 'Test Device',
        appVersion: '1.0.0',
      };

      expect(client.getSessionInfo()).toBeNull();

      client.setSessionInfo(sessionInfo);

      expect(client.getSessionInfo()).toEqual(sessionInfo);
    });

    it('should clear session info when set to null', () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const sessionInfo: SessionInfo = {
        sessionId: 'test-session-id',
        deviceId: 'test-device-id',
        deviceType: DeviceType.MOBILE,
        devicePlatform: DevicePlatform.IOS,
      };

      client.setSessionInfo(sessionInfo);
      expect(client.getSessionInfo()).toEqual(sessionInfo);

      client.setSessionInfo(null);
      expect(client.getSessionInfo()).toBeNull();
    });
  });

  describe('request interceptor', () => {
    it('should inject session headers when session info is set', () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const sessionInfo: SessionInfo = {
        sessionId: 'test-session-id',
        deviceId: 'test-device-id',
        deviceType: DeviceType.MOBILE,
        devicePlatform: DevicePlatform.IOS,
        deviceName: 'Test Device',
        appVersion: '1.0.0',
      };

      client.setSessionInfo(sessionInfo);

      const mockConfig = {
        headers: {
          set: jest.fn(),
        },
      } as unknown as InternalAxiosRequestConfig;

      const result = requestInterceptor(mockConfig);

      expect(mockConfig.headers.set).toHaveBeenCalledWith('maestro-session-id', 'test-session-id');
      expect(mockConfig.headers.set).toHaveBeenCalledWith('x-device-id', 'test-device-id');
      expect(mockConfig.headers.set).toHaveBeenCalledWith('x-device-type', DeviceType.MOBILE);
      expect(mockConfig.headers.set).toHaveBeenCalledWith('x-device-platform', DevicePlatform.IOS);
      expect(mockConfig.headers.set).toHaveBeenCalledWith('x-device-name', 'Test Device');
      expect(mockConfig.headers.set).toHaveBeenCalledWith('x-app-version', '1.0.0');
      expect(result).toBe(mockConfig);
    });

    it('should not inject headers when session info is not set', () => {
      new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const mockConfig = {
        headers: {
          set: jest.fn(),
        },
      } as unknown as InternalAxiosRequestConfig;

      const result = requestInterceptor(mockConfig);

      expect(mockConfig.headers.set).not.toHaveBeenCalled();
      expect(result).toBe(mockConfig);
    });

    it('should not inject optional headers when not provided', () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const sessionInfo: SessionInfo = {
        sessionId: 'test-session-id',
        deviceId: 'test-device-id',
        deviceType: DeviceType.MOBILE,
        devicePlatform: DevicePlatform.IOS,
      };

      client.setSessionInfo(sessionInfo);

      const mockConfig = {
        headers: {
          set: jest.fn(),
        },
      } as unknown as InternalAxiosRequestConfig;

      requestInterceptor(mockConfig);

      expect(mockConfig.headers.set).toHaveBeenCalledTimes(4);
      expect(mockConfig.headers.set).not.toHaveBeenCalledWith('x-device-name', expect.any(String));
      expect(mockConfig.headers.set).not.toHaveBeenCalledWith('x-app-version', expect.any(String));
    });
  });

  describe('response error interceptor', () => {
    it('should handle 401 unauthorized error', async () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const onUnauthorized = jest.fn();
      client.setOnUnauthorized(onUnauthorized);

      const sessionInfo: SessionInfo = {
        sessionId: 'test-session-id',
        deviceId: 'test-device-id',
        deviceType: DeviceType.MOBILE,
        devicePlatform: DevicePlatform.IOS,
      };
      client.setSessionInfo(sessionInfo);

      const mockError = {
        response: {
          status: 401,
          data: { status: 'error', message: 'Invalid session' },
        },
        message: 'Request failed with status code 401',
      } as AxiosError;

      await expect(responseErrorInterceptor(mockError)).rejects.toThrow(ApiClientError);

      expect(onUnauthorized).toHaveBeenCalled();
      expect(client.getSessionInfo()).toBeNull();
    });

    it('should handle 403 forbidden error', async () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const onForbidden = jest.fn();
      client.setOnForbidden(onForbidden);

      const mockError = {
        response: {
          status: 403,
          data: {
            status: 'error',
            message: 'Device limit exceeded for this organization',
          },
        },
        message: 'Request failed with status code 403',
      } as AxiosError;

      await expect(responseErrorInterceptor(mockError)).rejects.toThrow(ApiClientError);

      expect(onForbidden).toHaveBeenCalledWith('Device limit exceeded for this organization');
    });

    it('should handle network errors', async () => {
      new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const mockError = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
        response: undefined,
      } as AxiosError;

      try {
        await responseErrorInterceptor(mockError);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).code).toBe('NETWORK_ERROR');
        expect((error as ApiClientError).isRetryable).toBe(true);
      }
    });

    it('should handle timeout errors', async () => {
      new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const mockError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
        response: undefined,
      } as AxiosError;

      try {
        await responseErrorInterceptor(mockError);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).code).toBe('TIMEOUT');
        expect((error as ApiClientError).isRetryable).toBe(true);
      }
    });

    it('should handle 500 server errors as retryable', async () => {
      new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const mockError = {
        response: {
          status: 500,
          data: { status: 'error', message: 'Internal server error' },
        },
        message: 'Request failed with status code 500',
      } as AxiosError;

      try {
        await responseErrorInterceptor(mockError);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).status).toBe(500);
        expect((error as ApiClientError).isRetryable).toBe(true);
      }
    });

    it('should handle 400 client errors as non-retryable', async () => {
      new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const mockError = {
        response: {
          status: 400,
          data: { status: 'error', message: 'Validation failed' },
        },
        message: 'Request failed with status code 400',
      } as AxiosError;

      try {
        await responseErrorInterceptor(mockError);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).status).toBe(400);
        expect((error as ApiClientError).isRetryable).toBe(false);
      }
    });
  });

  describe('HTTP methods', () => {
    it('should make GET request and return data', async () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const mockResponse: AxiosResponse = {
        data: { id: 1, name: 'Test' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it('should make POST request and return data', async () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const mockResponse: AxiosResponse = {
        data: { id: 1, created: true },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const requestData = { name: 'Test' };
      const result = await client.post('/test', requestData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', requestData, undefined);
      expect(result).toEqual({ id: 1, created: true });
    });

    it('should make PUT request and return data', async () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const mockResponse: AxiosResponse = {
        data: { id: 1, updated: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      const requestData = { name: 'Updated' };
      const result = await client.put('/test/1', requestData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', requestData, undefined);
      expect(result).toEqual({ id: 1, updated: true });
    });

    it('should make PATCH request and return data', async () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const mockResponse: AxiosResponse = {
        data: { id: 1, patched: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      mockAxiosInstance.patch.mockResolvedValue(mockResponse);

      const requestData = { status: 'active' };
      const result = await client.patch('/test/1', requestData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test/1', requestData, undefined);
      expect(result).toEqual({ id: 1, patched: true });
    });

    it('should make DELETE request and return data', async () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
      });

      const mockResponse: AxiosResponse = {
        data: { deleted: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      const result = await client.delete('/test/1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('retry logic', () => {
    it('should retry on network error', async () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
        maxRetries: 2,
        retryDelay: 10, // Short delay for testing
      });

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      const networkError = new ApiClientError('Network Error', 0, 'NETWORK_ERROR', true);

      mockAxiosInstance.get.mockRejectedValueOnce(networkError).mockResolvedValueOnce(mockResponse);

      const result = await client.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('should not retry on client error', async () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
        maxRetries: 2,
        retryDelay: 10,
      });

      const clientError = new ApiClientError('Bad Request', 400, 'CLIENT_ERROR', false);

      mockAxiosInstance.get.mockRejectedValue(clientError);

      await expect(client.get('/test')).rejects.toThrow(ApiClientError);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after max retries', async () => {
      const client = new ApiClient({
        baseURL: 'https://api.example.com',
        maxRetries: 2,
        retryDelay: 10,
      });

      const networkError = new ApiClientError('Network Error', 0, 'NETWORK_ERROR', true);

      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(client.get('/test')).rejects.toThrow(ApiClientError);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});

describe('ApiClientError', () => {
  it('should create error with all properties', () => {
    const error = new ApiClientError('Test error', 500, 'SERVER_ERROR', true);

    expect(error.message).toBe('Test error');
    expect(error.status).toBe(500);
    expect(error.code).toBe('SERVER_ERROR');
    expect(error.isRetryable).toBe(true);
    expect(error.name).toBe('ApiClientError');
  });

  it('should default isRetryable to false', () => {
    const error = new ApiClientError('Test error', 400, 'CLIENT_ERROR');

    expect(error.isRetryable).toBe(false);
  });
});

describe('singleton functions', () => {
  beforeEach(() => {
    resetApiClient();
  });

  describe('initializeApiClient', () => {
    it('should create and return API client instance', () => {
      const client = initializeApiClient({
        baseURL: 'https://api.example.com',
      });

      expect(client).toBeInstanceOf(ApiClient);
      expect(isApiClientInitialized()).toBe(true);
    });

    it('should use default base URL if not provided', () => {
      initializeApiClient();

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3000/api/v1',
        })
      );
    });
  });

  describe('getApiClient', () => {
    it('should return initialized client', () => {
      const initialized = initializeApiClient({
        baseURL: 'https://api.example.com',
      });

      const retrieved = getApiClient();

      expect(retrieved).toBe(initialized);
    });

    it('should throw if client not initialized', () => {
      expect(() => getApiClient()).toThrow(
        'API client not initialized. Call initializeApiClient() first.'
      );
    });
  });

  describe('isApiClientInitialized', () => {
    it('should return false when not initialized', () => {
      expect(isApiClientInitialized()).toBe(false);
    });

    it('should return true when initialized', () => {
      initializeApiClient();
      expect(isApiClientInitialized()).toBe(true);
    });
  });

  describe('resetApiClient', () => {
    it('should reset the client instance', () => {
      initializeApiClient();
      expect(isApiClientInitialized()).toBe(true);

      resetApiClient();
      expect(isApiClientInitialized()).toBe(false);
    });
  });
});

describe('platform utilities', () => {
  describe('getDevicePlatform', () => {
    it('should return IOS for ios platform', () => {
      expect(getDevicePlatform()).toBe(DevicePlatform.IOS);
    });
  });

  describe('getDeviceType', () => {
    it('should return MOBILE for ios platform', () => {
      expect(getDeviceType()).toBe(DeviceType.MOBILE);
    });
  });
});
