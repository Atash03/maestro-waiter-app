/**
 * Authentication Store for the Maestro Waiter App
 *
 * Features:
 * - Session ID storage and management
 * - User account information
 * - Device ID management (generate once, persist)
 * - Login/logout actions
 * - Session validation on app start
 * - Secure credential storage using expo-secure-store
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import uuid from 'react-native-uuid';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { login as apiLogin, logout as apiLogout, checkSession } from '../services/api/auth';
import {
  getApiClient,
  getDevicePlatform,
  getDeviceType,
  type SessionInfo,
} from '../services/api/client';
import { resetNotificationHandler } from '../services/notifications';
import { isSSEClientInitialized, resetSSEClient } from '../services/sse';
import type { LoginRequest, LoginResponse } from '../types/api';
import type { Account } from '../types/models';

// Storage keys
const STORAGE_KEYS = {
  DEVICE_ID: 'maestro_device_id',
  SESSION_ID: 'maestro_session_id',
  REMEMBER_ME: 'maestro_remember_me',
  SAVED_USERNAME: 'maestro_saved_username',
} as const;

/**
 * Authentication state interface
 */
export interface AuthState {
  // State
  sessionId: string | null;
  account: Account | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  error: string | null;
  rememberMe: boolean;
  savedUsername: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (request: LoginRequest, rememberMe?: boolean) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  clearError: () => void;
  setRememberMe: (value: boolean) => void;
}

/**
 * Get or create device ID
 * Device ID is generated once and persisted across app installations
 */
async function getOrCreateDeviceId(): Promise<string> {
  try {
    // Try to get existing device ID from secure storage
    const existingId = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);
    if (existingId) {
      return existingId;
    }

    // Generate new device ID
    const newId = uuid.v4() as string;

    // Store in secure storage
    await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, newId);

    return newId;
  } catch {
    // Fallback to AsyncStorage if SecureStore fails (e.g., on some emulators)
    const existingId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (existingId) {
      return existingId;
    }

    const newId = uuid.v4() as string;
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, newId);
    return newId;
  }
}

/**
 * Save session ID securely
 */
async function saveSessionId(sessionId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.SESSION_ID, sessionId);
  } catch {
    // Fallback to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
  }
}

/**
 * Get saved session ID
 */
async function getSavedSessionId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.SESSION_ID);
  } catch {
    // Fallback to AsyncStorage
    return AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
  }
}

/**
 * Clear saved session ID
 */
async function clearSessionId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
  } catch {
    // Fallback to AsyncStorage
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_ID);
  }
}

/**
 * Save remember me preference and username
 */
async function saveRememberMeData(rememberMe: boolean, username: string | null): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(rememberMe));
  if (rememberMe && username) {
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_USERNAME, username);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_USERNAME);
  }
}

/**
 * Get remember me preference
 */
async function getRememberMeData(): Promise<{
  rememberMe: boolean;
  savedUsername: string | null;
}> {
  const rememberMeStr = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
  const rememberMe = rememberMeStr ? JSON.parse(rememberMeStr) : false;
  const savedUsername = rememberMe ? await AsyncStorage.getItem(STORAGE_KEYS.SAVED_USERNAME) : null;

  return { rememberMe, savedUsername };
}

/**
 * Update API client session info
 */
function updateApiClientSession(sessionId: string | null, deviceId: string): void {
  const client = getApiClient();

  if (sessionId) {
    const sessionInfo: SessionInfo = {
      sessionId,
      deviceId,
      deviceType: getDeviceType(),
      devicePlatform: getDevicePlatform(),
    };
    client.setSessionInfo(sessionInfo);
  } else {
    client.setSessionInfo(null);
  }
}

/**
 * Auth store using Zustand
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  sessionId: null,
  account: null,
  deviceId: null,
  isAuthenticated: false,
  isInitializing: true,
  isLoggingIn: false,
  isLoggingOut: false,
  error: null,
  rememberMe: false,
  savedUsername: null,

  /**
   * Initialize the auth store
   * Called on app start to restore session if valid
   */
  initialize: async () => {
    set({ isInitializing: true, error: null });

    try {
      // Get or create device ID
      const deviceId = await getOrCreateDeviceId();
      set({ deviceId });

      // Get remember me preference
      const { rememberMe, savedUsername } = await getRememberMeData();
      set({ rememberMe, savedUsername });

      // Get saved session ID
      const sessionId = await getSavedSessionId();

      if (sessionId) {
        // Update API client with session info
        updateApiClientSession(sessionId, deviceId);

        // Validate the session with the server
        try {
          const account = await checkSession();
          set({
            sessionId,
            account,
            isAuthenticated: true,
            isInitializing: false,
          });
        } catch {
          // Session is invalid, clear it
          await clearSessionId();
          updateApiClientSession(null, deviceId);
          set({
            sessionId: null,
            account: null,
            isAuthenticated: false,
            isInitializing: false,
          });
        }
      } else {
        set({ isInitializing: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize auth';
      set({
        error: message,
        isInitializing: false,
      });
    }
  },

  /**
   * Login with username and password
   */
  login: async (request: LoginRequest, rememberMe = false) => {
    const { deviceId } = get();

    if (!deviceId) {
      throw new Error('Device ID not initialized. Call initialize() first.');
    }

    set({ isLoggingIn: true, error: null });

    try {
      // Update API client with device info for the login request
      updateApiClientSession(null, deviceId);

      // Call the login API
      const response = await apiLogin(request);

      // Save session ID securely
      await saveSessionId(response.sessionId);

      // Save remember me preference
      await saveRememberMeData(rememberMe, rememberMe ? request.username : null);

      // Update API client with new session info
      updateApiClientSession(response.sessionId, deviceId);

      set({
        sessionId: response.sessionId,
        account: response.account,
        isAuthenticated: true,
        isLoggingIn: false,
        rememberMe,
        savedUsername: rememberMe ? request.username : null,
      });

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({
        error: message,
        isLoggingIn: false,
      });
      throw error;
    }
  },

  /**
   * Logout and clear session
   */
  logout: async () => {
    const { deviceId } = get();

    set({ isLoggingOut: true, error: null });

    try {
      // Call the logout API (ignore errors if already logged out)
      try {
        await apiLogout();
      } catch {
        // Ignore logout API errors
      }

      // Clear session ID from storage
      await clearSessionId();

      // Clear session from API client
      if (deviceId) {
        updateApiClientSession(null, deviceId);
      }

      // Clean up SSE connection and notification handler to prevent memory leaks
      if (isSSEClientInitialized()) {
        resetSSEClient();
      }
      resetNotificationHandler();

      set({
        sessionId: null,
        account: null,
        isAuthenticated: false,
        isLoggingOut: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      set({
        error: message,
        isLoggingOut: false,
      });
      throw error;
    }
  },

  /**
   * Validate current session with server
   * Returns true if session is valid, false otherwise
   */
  validateSession: async () => {
    const { sessionId, deviceId } = get();

    if (!sessionId || !deviceId) {
      return false;
    }

    try {
      const account = await checkSession();
      set({ account });
      return true;
    } catch {
      // Session is invalid, clear it
      await clearSessionId();
      updateApiClientSession(null, deviceId);
      set({
        sessionId: null,
        account: null,
        isAuthenticated: false,
      });
      return false;
    }
  },

  /**
   * Clear any error message
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Set remember me preference
   */
  setRememberMe: (value: boolean) => {
    set({ rememberMe: value });
  },
}));

/**
 * Hook to get only auth status (optimized for components that only need auth state)
 */
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);

/**
 * Hook to get current account
 */
export const useAccount = () => useAuthStore((state) => state.account);

/**
 * Hook to get auth loading states
 */
export const useAuthLoading = () =>
  useAuthStore(
    useShallow((state) => ({
      isInitializing: state.isInitializing,
      isLoggingIn: state.isLoggingIn,
      isLoggingOut: state.isLoggingOut,
    }))
  );

/**
 * Hook to get auth error
 */
export const useAuthError = () => useAuthStore((state) => state.error);

/**
 * Hook to get remember me data
 */
export const useRememberMe = () =>
  useAuthStore(
    useShallow((state) => ({
      rememberMe: state.rememberMe,
      savedUsername: state.savedUsername,
    }))
  );
