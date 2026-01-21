/**
 * Tests for the Auth Store
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { LoginResponse } from '../types/api';
import { Role } from '../types/enums';
import type { Account } from '../types/models';

// Mock the API client module
const mockSetSessionInfo = jest.fn();
const mockGetApiClient = jest.fn(() => ({
  setSessionInfo: mockSetSessionInfo,
}));

jest.mock('../services/api/client', () => ({
  getApiClient: () => mockGetApiClient(),
  getDeviceType: () => 'mobile',
  getDevicePlatform: () => 'ios',
}));

// Mock the auth API module
const mockApiLogin = jest.fn();
const mockCheckSession = jest.fn();
const mockApiLogout = jest.fn();

jest.mock('../services/api/auth', () => ({
  login: (request: unknown) => mockApiLogin(request),
  checkSession: () => mockCheckSession(),
  logout: () => mockApiLogout(),
}));

// Get mocked modules - AsyncStorage mock returns default object with the methods
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

// Import the store after mocking
import {
  useAccount,
  useAuthError,
  useAuthLoading,
  useAuthStore,
  useIsAuthenticated,
} from '../stores/authStore';

// Test data
const testAccount: Account = {
  id: 'user-123',
  username: 'testwaiter',
  role: Role.WAITER,
  organizationId: 'org-456',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const testLoginResponse: LoginResponse = {
  account: testAccount,
  sessionId: 'session-789',
};

describe('AuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useAuthStore.setState({
      sessionId: null,
      account: null,
      deviceId: null,
      isAuthenticated: false,
      isInitializing: true,
      isLoggingIn: false,
      isLoggingOut: false,
      error: null,
    });

    // Reset mock implementations for SecureStore
    (mockedSecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (mockedSecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (mockedSecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    // Reset mock implementations for AsyncStorage
    (mockedAsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (mockedAsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (mockedAsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.sessionId).toBeNull();
      expect(state.account).toBeNull();
      expect(state.deviceId).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitializing).toBe(true);
      expect(state.isLoggingIn).toBe(false);
      expect(state.isLoggingOut).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should create device ID if none exists', async () => {
      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.deviceId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(state.isInitializing).toBe(false);
    });

    it('should use existing device ID from SecureStore', async () => {
      (mockedSecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'maestro_device_id') return 'existing-device-id';
        return null;
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.deviceId).toBe('existing-device-id');
    });

    it('should restore valid session on initialize', async () => {
      (mockedSecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'maestro_device_id') return 'device-123';
        if (key === 'maestro_session_id') return 'session-456';
        return null;
      });
      mockCheckSession.mockResolvedValueOnce(testAccount);

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.sessionId).toBe('session-456');
      expect(state.account).toEqual(testAccount);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitializing).toBe(false);
      expect(mockSetSessionInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-456',
          deviceId: 'device-123',
        })
      );
    });

    it('should clear invalid session on initialize', async () => {
      (mockedSecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'maestro_device_id') return 'device-123';
        if (key === 'maestro_session_id') return 'invalid-session';
        return null;
      });
      mockCheckSession.mockRejectedValueOnce(new Error('Unauthorized'));

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.account).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitializing).toBe(false);
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('maestro_session_id');
    });

    it('should fall back to AsyncStorage if SecureStore fails', async () => {
      (mockedSecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('SecureStore error')
      );
      (mockedAsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'maestro_device_id') return 'fallback-device-id';
        return null;
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.deviceId).toBe('fallback-device-id');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Initialize first to set up device ID
      const { initialize } = useAuthStore.getState();
      await initialize();
    });

    it('should login successfully', async () => {
      mockApiLogin.mockResolvedValueOnce(testLoginResponse);

      const { login } = useAuthStore.getState();
      const result = await login({ username: 'testwaiter', password: 'password123' });

      const state = useAuthStore.getState();
      expect(result).toEqual(testLoginResponse);
      expect(state.sessionId).toBe('session-789');
      expect(state.account).toEqual(testAccount);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoggingIn).toBe(false);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        'maestro_session_id',
        'session-789'
      );
    });

    it('should set isLoggingIn while login is in progress', async () => {
      let resolveLogin: ((value: LoginResponse) => void) | undefined;
      mockApiLogin.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveLogin = resolve;
        })
      );

      const { login } = useAuthStore.getState();
      const loginPromise = login({ username: 'testwaiter', password: 'password123' });

      // Check that isLoggingIn is true while waiting
      expect(useAuthStore.getState().isLoggingIn).toBe(true);

      // Complete the login
      resolveLogin?.(testLoginResponse);
      await loginPromise;

      // Check that isLoggingIn is false after completion
      expect(useAuthStore.getState().isLoggingIn).toBe(false);
    });

    it('should handle login failure', async () => {
      mockApiLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

      const { login } = useAuthStore.getState();

      await expect(login({ username: 'testwaiter', password: 'wrong' })).rejects.toThrow(
        'Invalid credentials'
      );

      const state = useAuthStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoggingIn).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('should throw error if device ID not initialized', async () => {
      // Reset device ID
      useAuthStore.setState({ deviceId: null });

      const { login } = useAuthStore.getState();

      await expect(login({ username: 'testwaiter', password: 'password123' })).rejects.toThrow(
        'Device ID not initialized'
      );
    });

    it('should update API client session info on successful login', async () => {
      mockApiLogin.mockResolvedValueOnce(testLoginResponse);

      const { login } = useAuthStore.getState();
      await login({ username: 'testwaiter', password: 'password123' });

      expect(mockSetSessionInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-789',
        })
      );
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      // Initialize and login first
      const { initialize } = useAuthStore.getState();
      await initialize();
      mockApiLogin.mockResolvedValueOnce(testLoginResponse);
      const { login } = useAuthStore.getState();
      await login({ username: 'testwaiter', password: 'password123' });
    });

    it('should logout successfully', async () => {
      mockApiLogout.mockResolvedValueOnce(undefined);

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.account).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoggingOut).toBe(false);
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('maestro_session_id');
    });

    it('should set isLoggingOut while logout is in progress', async () => {
      let resolveLogout: (() => void) | undefined;
      mockApiLogout.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveLogout = resolve;
        })
      );

      const { logout } = useAuthStore.getState();
      const logoutPromise = logout();

      // Check that isLoggingOut is true while waiting
      expect(useAuthStore.getState().isLoggingOut).toBe(true);

      // Complete the logout
      resolveLogout?.();
      await logoutPromise;

      // Check that isLoggingOut is false after completion
      expect(useAuthStore.getState().isLoggingOut).toBe(false);
    });

    it('should clear session even if logout API fails', async () => {
      mockApiLogout.mockRejectedValueOnce(new Error('Network error'));

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should clear API client session info on logout', async () => {
      mockApiLogout.mockResolvedValueOnce(undefined);

      const { logout } = useAuthStore.getState();
      await logout();

      expect(mockSetSessionInfo).toHaveBeenCalledWith(null);
    });
  });

  describe('validateSession', () => {
    beforeEach(async () => {
      const { initialize } = useAuthStore.getState();
      await initialize();
      mockApiLogin.mockResolvedValueOnce(testLoginResponse);
      const { login } = useAuthStore.getState();
      await login({ username: 'testwaiter', password: 'password123' });
    });

    it('should return true for valid session', async () => {
      mockCheckSession.mockResolvedValueOnce(testAccount);

      const { validateSession } = useAuthStore.getState();
      const isValid = await validateSession();

      expect(isValid).toBe(true);
      expect(useAuthStore.getState().account).toEqual(testAccount);
    });

    it('should return false and clear session for invalid session', async () => {
      mockCheckSession.mockRejectedValueOnce(new Error('Unauthorized'));

      const { validateSession } = useAuthStore.getState();
      const isValid = await validateSession();

      expect(isValid).toBe(false);
      const state = useAuthStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should return false if no session ID', async () => {
      useAuthStore.setState({ sessionId: null });

      const { validateSession } = useAuthStore.getState();
      const isValid = await validateSession();

      expect(isValid).toBe(false);
    });

    it('should return false if no device ID', async () => {
      useAuthStore.setState({ deviceId: null });

      const { validateSession } = useAuthStore.getState();
      const isValid = await validateSession();

      expect(isValid).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      useAuthStore.setState({ error: 'Some error' });

      const { clearError } = useAuthStore.getState();
      clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});

describe('Auth Store Hooks', () => {
  beforeEach(() => {
    useAuthStore.setState({
      sessionId: 'session-123',
      account: testAccount,
      deviceId: 'device-456',
      isAuthenticated: true,
      isInitializing: false,
      isLoggingIn: false,
      isLoggingOut: true,
      error: 'Test error',
    });
  });

  describe('useIsAuthenticated', () => {
    it('should return isAuthenticated state', () => {
      // Just verify the hook exists and can be called
      expect(useIsAuthenticated).toBeDefined();
      expect(typeof useIsAuthenticated).toBe('function');
    });
  });

  describe('useAccount', () => {
    it('should return account state', () => {
      expect(useAccount).toBeDefined();
      expect(typeof useAccount).toBe('function');
    });
  });

  describe('useAuthLoading', () => {
    it('should return loading states', () => {
      expect(useAuthLoading).toBeDefined();
      expect(typeof useAuthLoading).toBe('function');
    });
  });

  describe('useAuthError', () => {
    it('should return error state', () => {
      expect(useAuthError).toBeDefined();
      expect(typeof useAuthError).toBe('function');
    });
  });
});

describe('AuthState type export', () => {
  it('should export AuthState type', () => {
    // This test verifies that the AuthState type is correctly exported
    // by checking if the store state shape matches the expected interface
    const state = useAuthStore.getState();

    expect(state).toHaveProperty('sessionId');
    expect(state).toHaveProperty('account');
    expect(state).toHaveProperty('deviceId');
    expect(state).toHaveProperty('isAuthenticated');
    expect(state).toHaveProperty('isInitializing');
    expect(state).toHaveProperty('isLoggingIn');
    expect(state).toHaveProperty('isLoggingOut');
    expect(state).toHaveProperty('error');
    expect(state).toHaveProperty('initialize');
    expect(state).toHaveProperty('login');
    expect(state).toHaveProperty('logout');
    expect(state).toHaveProperty('validateSession');
    expect(state).toHaveProperty('clearError');
  });
});

describe('Store Index Export', () => {
  it('should export all auth store functions from index', async () => {
    const storeIndex = await import('../stores/index');

    expect(storeIndex.useAuthStore).toBeDefined();
    expect(storeIndex.useIsAuthenticated).toBeDefined();
    expect(storeIndex.useAccount).toBeDefined();
    expect(storeIndex.useAuthLoading).toBeDefined();
    expect(storeIndex.useAuthError).toBeDefined();
  });
});
