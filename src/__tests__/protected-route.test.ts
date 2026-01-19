/**
 * Tests for Protected Route Logic
 *
 * These tests verify:
 * - useProtectedRoute hook navigation behavior
 * - useAuthCallbacks hook API client integration
 * - Route segment detection utilities
 * - Session validation and redirect logic
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

// Mock expo-router
const mockReplace = jest.fn();
const mockUseRouter = jest.fn(() => ({
  replace: mockReplace,
  push: jest.fn(),
  back: jest.fn(),
}));
const mockUseSegments = jest.fn().mockReturnValue([] as string[]);
const mockUseRootNavigationState = jest
  .fn()
  .mockReturnValue({ key: 'root-123' } as { key: string | null });

jest.mock('expo-router', () => ({
  useRouter: () => mockUseRouter(),
  useSegments: () => mockUseSegments(),
  useRootNavigationState: () => mockUseRootNavigationState(),
}));

// Mock the API client module
const mockOnUnauthorized = { current: null as (() => void) | null };
const mockOnForbidden = { current: null as ((msg: string) => void) | null };
const mockApiClient = {
  get onUnauthorized() {
    return mockOnUnauthorized.current;
  },
  set onUnauthorized(cb: (() => void) | null) {
    mockOnUnauthorized.current = cb;
  },
  get onForbidden() {
    return mockOnForbidden.current;
  },
  set onForbidden(cb: ((msg: string) => void) | null) {
    mockOnForbidden.current = cb;
  },
};

jest.mock('../services/api/client', () => ({
  getApiClient: () => mockApiClient,
  isApiClientInitialized: () => true,
}));

// Mock auth store
const mockAuthState = {
  isAuthenticated: false,
  isInitializing: true,
  logout: jest.fn(() => Promise.resolve()),
};

jest.mock('../stores/authStore', () => ({
  useAuthStore: (selector?: (state: typeof mockAuthState) => unknown) => {
    if (selector) {
      return selector(mockAuthState);
    }
    return mockAuthState;
  },
}));

describe('Protected Route Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockClear();
    mockAuthState.isAuthenticated = false;
    mockAuthState.isInitializing = true;
    mockAuthState.logout.mockClear();
    mockUseSegments.mockReturnValue([] as string[]);
    mockUseRootNavigationState.mockReturnValue({ key: 'root-123' } as { key: string | null });
    mockOnUnauthorized.current = null;
    mockOnForbidden.current = null;
  });

  describe('useProtectedRoute', () => {
    // Need to import after mocks are set up
    let useProtectedRoute: typeof import('../hooks/useProtectedRoute').useProtectedRoute;

    beforeAll(() => {
      useProtectedRoute = require('../hooks/useProtectedRoute').useProtectedRoute;
    });

    it('should return isNavigationReady based on navigation state', () => {
      mockUseRootNavigationState.mockReturnValue({ key: 'root-123' } as { key: string | null });
      const { result } = renderHook(() => useProtectedRoute());

      expect(result.current.isNavigationReady).toBe(true);
    });

    it('should return isNavigationReady as false when navigation key is null', () => {
      mockUseRootNavigationState.mockReturnValue({ key: null } as { key: string | null });
      const { result } = renderHook(() => useProtectedRoute());

      expect(result.current.isNavigationReady).toBe(false);
    });

    it('should return isCheckingAuth as true while initializing', () => {
      mockAuthState.isInitializing = true;
      const { result } = renderHook(() => useProtectedRoute());

      expect(result.current.isCheckingAuth).toBe(true);
    });

    it('should redirect to login when not authenticated and not in auth group', async () => {
      mockAuthState.isAuthenticated = false;
      mockAuthState.isInitializing = false;
      mockUseSegments.mockReturnValue(['(tabs)'] as string[]);

      renderHook(() => useProtectedRoute());

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
      });
    });

    it('should redirect to tabs when authenticated and in auth group', async () => {
      mockAuthState.isAuthenticated = true;
      mockAuthState.isInitializing = false;
      mockUseSegments.mockReturnValue(['(auth)'] as string[]);

      renderHook(() => useProtectedRoute());

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
      });
    });

    it('should not redirect when authenticated and in main group', async () => {
      mockAuthState.isAuthenticated = true;
      mockAuthState.isInitializing = false;
      mockUseSegments.mockReturnValue(['(tabs)'] as string[]);

      renderHook(() => useProtectedRoute());

      // Wait a bit to ensure no redirect happens
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should not redirect when not authenticated and in auth group', async () => {
      mockAuthState.isAuthenticated = false;
      mockAuthState.isInitializing = false;
      mockUseSegments.mockReturnValue(['(auth)'] as string[]);

      renderHook(() => useProtectedRoute());

      // Wait a bit to ensure no redirect happens
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should not navigate when navigation is not ready', async () => {
      mockUseRootNavigationState.mockReturnValue({ key: null } as { key: string | null });
      mockAuthState.isAuthenticated = false;
      mockAuthState.isInitializing = false;
      mockUseSegments.mockReturnValue(['(tabs)'] as string[]);

      renderHook(() => useProtectedRoute());

      // Wait a bit to ensure no redirect happens
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should handle (main) group as protected route', async () => {
      mockAuthState.isAuthenticated = true;
      mockAuthState.isInitializing = false;
      mockUseSegments.mockReturnValue(['(main)'] as string[]);

      renderHook(() => useProtectedRoute());

      // Wait a bit to ensure no redirect happens (user is authenticated in main)
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('useIsRouteProtected', () => {
    let useIsRouteProtected: typeof import('../hooks/useProtectedRoute').useIsRouteProtected;

    beforeAll(() => {
      useIsRouteProtected = require('../hooks/useProtectedRoute').useIsRouteProtected;
    });

    it('should return true when in tabs group', () => {
      mockUseSegments.mockReturnValue(['(tabs)'] as string[]);
      const { result } = renderHook(() => useIsRouteProtected());

      expect(result.current).toBe(true);
    });

    it('should return true when in main group', () => {
      mockUseSegments.mockReturnValue(['(main)'] as string[]);
      const { result } = renderHook(() => useIsRouteProtected());

      expect(result.current).toBe(true);
    });

    it('should return false when in auth group', () => {
      mockUseSegments.mockReturnValue(['(auth)'] as string[]);
      const { result } = renderHook(() => useIsRouteProtected());

      expect(result.current).toBe(false);
    });

    it('should return false when at root', () => {
      mockUseSegments.mockReturnValue([] as string[]);
      const { result } = renderHook(() => useIsRouteProtected());

      expect(result.current).toBe(false);
    });
  });

  describe('useAuthCallbacks', () => {
    let useAuthCallbacks: typeof import('../hooks/useProtectedRoute').useAuthCallbacks;

    beforeAll(() => {
      useAuthCallbacks = require('../hooks/useProtectedRoute').useAuthCallbacks;
    });

    it('should set onUnauthorized callback on API client', async () => {
      renderHook(() => useAuthCallbacks());

      // Wait for the dynamic import to complete
      await waitFor(() => {
        expect(mockOnUnauthorized.current).not.toBeNull();
      });
    });

    it('should set onForbidden callback on API client', async () => {
      renderHook(() => useAuthCallbacks());

      // Wait for the dynamic import to complete
      await waitFor(() => {
        expect(mockOnForbidden.current).not.toBeNull();
      });
    });

    it('should call logout and redirect when onUnauthorized is triggered', async () => {
      renderHook(() => useAuthCallbacks());

      // Wait for callbacks to be set
      await waitFor(() => {
        expect(mockOnUnauthorized.current).not.toBeNull();
      });

      // Trigger the unauthorized callback
      await act(async () => {
        if (mockOnUnauthorized.current) {
          await mockOnUnauthorized.current();
        }
      });

      expect(mockAuthState.logout).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });

    it('should log warning when onForbidden is triggered', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      renderHook(() => useAuthCallbacks());

      // Wait for callbacks to be set
      await waitFor(() => {
        expect(mockOnForbidden.current).not.toBeNull();
      });

      // Trigger the forbidden callback
      if (mockOnForbidden.current) {
        mockOnForbidden.current('Device limit exceeded');
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith('Access forbidden:', 'Device limit exceeded');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Hook exports', () => {
    it('should export useProtectedRoute', () => {
      const { useProtectedRoute } = require('../hooks/useProtectedRoute');
      expect(useProtectedRoute).toBeDefined();
      expect(typeof useProtectedRoute).toBe('function');
    });

    it('should export useIsRouteProtected', () => {
      const { useIsRouteProtected } = require('../hooks/useProtectedRoute');
      expect(useIsRouteProtected).toBeDefined();
      expect(typeof useIsRouteProtected).toBe('function');
    });

    it('should export useAuthCallbacks', () => {
      const { useAuthCallbacks } = require('../hooks/useProtectedRoute');
      expect(useAuthCallbacks).toBeDefined();
      expect(typeof useAuthCallbacks).toBe('function');
    });

    it('should export ProtectedRouteState type', () => {
      // TypeScript type test - just verify the module exports work
      const hookModule = require('../hooks/useProtectedRoute');
      expect(hookModule).toBeDefined();
    });
  });

  describe('Hooks index exports', () => {
    it('should export all hooks from index', () => {
      const hooksIndex = require('../hooks/index');

      expect(hooksIndex.useProtectedRoute).toBeDefined();
      expect(hooksIndex.useIsRouteProtected).toBeDefined();
      expect(hooksIndex.useAuthCallbacks).toBeDefined();
    });
  });
});

describe('API Client Callback Properties', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should have onUnauthorized getter and setter', () => {
    jest.doMock('../services/api/client', () => {
      const actual = jest.requireActual('../services/api/client');
      return actual;
    });

    const { ApiClient } = require('../services/api/client');
    const client = new ApiClient({ baseURL: 'http://test.com' });

    const callback = jest.fn();
    client.onUnauthorized = callback;

    expect(client.onUnauthorized).toBe(callback);
  });

  it('should have onForbidden getter and setter', () => {
    jest.doMock('../services/api/client', () => {
      const actual = jest.requireActual('../services/api/client');
      return actual;
    });

    const { ApiClient } = require('../services/api/client');
    const client = new ApiClient({ baseURL: 'http://test.com' });

    const callback = jest.fn();
    client.onForbidden = callback;

    expect(client.onForbidden).toBe(callback);
  });
});
