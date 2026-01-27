/**
 * Discovery Store - Manages backend server discovery state
 *
 * Orchestrates the discovery lifecycle:
 * 1. Check for env var override (EXPO_PUBLIC_API_URL)
 * 2. Check AsyncStorage for cached server URL + health check
 * 3. Zeroconf/Bonjour scan on local network
 * 4. Manual URL entry fallback
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  DiscoveryTimeoutError,
  getDiscoveryService,
} from '../services/discovery/discoveryService';
import { checkServerHealth } from '../services/discovery/healthCheck';

const TAG = '[DiscoveryStore]';

// Storage key for caching the discovered server URL
const STORAGE_KEY_SERVER_URL = 'maestro_server_url';

/**
 * Discovery status state machine
 */
export type DiscoveryStatus =
  | 'idle'
  | 'checking_cache'
  | 'scanning'
  | 'connecting'
  | 'resolved'
  | 'failed'
  | 'manual_entry';

/**
 * Discovery state interface
 */
export interface DiscoveryState {
  status: DiscoveryStatus;
  serverUrl: string | null;
  serverName: string | null;
  error: string | null;
  isResolved: boolean;

  initialize: () => Promise<void>;
  startDiscovery: () => Promise<void>;
  setManualUrl: (url: string) => Promise<boolean>;
  showManualEntry: () => void;
  retry: () => Promise<void>;
  reset: () => Promise<void>;
  cleanup: () => void;
}

/**
 * Normalize a user-entered URL into a full API base URL.
 * Accepts formats like:
 *   - "192.168.1.100:3000"
 *   - "http://192.168.1.100:3000"
 *   - "http://192.168.1.100:3000/api/v1"
 */
function normalizeUrl(input: string): string | null {
  let url = input.trim();
  if (!url) return null;

  // Add http:// if no protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }

  // Remove trailing slash
  url = url.replace(/\/+$/, '');

  // Add /api/v1 if not already present
  if (!url.endsWith('/api/v1')) {
    // Remove partial paths that don't look like api/v1
    try {
      const parsed = new URL(url);
      if (parsed.pathname === '/' || parsed.pathname === '') {
        url = `${url}/api/v1`;
      }
    } catch {
      return null;
    }
  }

  // Validate it's a proper URL
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

/**
 * Cache the server URL to AsyncStorage
 */
async function cacheServerUrl(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, url);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load cached server URL from AsyncStorage
 */
async function loadCachedServerUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_SERVER_URL);
  } catch {
    return null;
  }
}

/**
 * Discovery store using Zustand
 */
export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  status: 'idle',
  serverUrl: null,
  serverName: null,
  error: null,
  isResolved: false,

  /**
   * Initialize discovery - main entry point.
   * Checks env var, then cache, then starts Zeroconf scan.
   */
  initialize: async () => {
    const state = get();
    if (state.isResolved) {
      console.log(TAG, 'Already resolved, skipping');
      return;
    }

    console.log(TAG, 'Initializing discovery...');

    // 1. Check for env var override
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
      console.log(TAG, `Using env var override: ${envUrl}`);
      set({
        status: 'resolved',
        serverUrl: envUrl,
        serverName: 'env-override',
        isResolved: true,
        error: null,
      });
      return;
    }

    // 2. Check cached URL
    set({ status: 'checking_cache' });
    const cachedUrl = await loadCachedServerUrl();
    console.log(TAG, cachedUrl ? `Found cached URL: ${cachedUrl}` : 'No cached URL');

    if (cachedUrl) {
      console.log(TAG, 'Health-checking cached URL...');
      set({ status: 'connecting' });
      const isHealthy = await checkServerHealth(cachedUrl);

      if (isHealthy) {
        console.log(TAG, 'Cached URL is healthy, using it');
        set({
          status: 'resolved',
          serverUrl: cachedUrl,
          serverName: 'cached',
          isResolved: true,
          error: null,
        });
        return;
      }
      console.log(TAG, 'Cached URL is stale, falling through to Zeroconf scan');
    }

    // 3. Start Zeroconf discovery
    await get().startDiscovery();
  },

  /**
   * Start Zeroconf scan for the Maestro backend
   */
  startDiscovery: async () => {
    console.log(TAG, 'Starting Zeroconf discovery...');
    set({ status: 'scanning', error: null });

    try {
      const service = getDiscoveryService();
      const server = await service.discover();

      // Verify with health check
      console.log(TAG, `Discovered server at ${server.url}, running health check...`);
      set({ status: 'connecting' });
      const isHealthy = await checkServerHealth(server.url);

      if (isHealthy) {
        console.log(TAG, `Server healthy! Caching URL and resolving: ${server.url}`);
        await cacheServerUrl(server.url);
        set({
          status: 'resolved',
          serverUrl: server.url,
          serverName: server.name,
          isResolved: true,
          error: null,
        });
      } else {
        console.warn(TAG, 'Server found but health check failed');
        set({
          status: 'failed',
          error: 'Found server but could not connect. It may still be starting up.',
        });
      }
    } catch (err) {
      let errorMessage: string;

      if (err instanceof DiscoveryTimeoutError) {
        errorMessage =
          'Could not find Maestro server. Make sure it\'s running and you\'re on the same WiFi network.';
      } else if (err instanceof Error) {
        errorMessage = `Network discovery error: ${err.message}`;
      } else {
        errorMessage = 'An unexpected error occurred during discovery.';
      }

      console.warn(TAG, `Discovery failed: ${errorMessage}`);
      set({ status: 'failed', error: errorMessage });
    }
  },

  /**
   * Attempt to connect using a manually entered URL
   */
  setManualUrl: async (input: string) => {
    console.log(TAG, `Manual URL entry: "${input}"`);
    const url = normalizeUrl(input);
    if (!url) {
      console.warn(TAG, `Invalid URL format: "${input}"`);
      set({ error: 'Please enter a valid address (e.g., 192.168.1.100:3000)' });
      return false;
    }

    console.log(TAG, `Normalized to: ${url}, running health check...`);
    set({ status: 'connecting', error: null });
    const isHealthy = await checkServerHealth(url);

    if (isHealthy) {
      console.log(TAG, `Manual URL healthy! Caching and resolving: ${url}`);
      await cacheServerUrl(url);
      set({
        status: 'resolved',
        serverUrl: url,
        serverName: 'manual',
        isResolved: true,
        error: null,
      });
      return true;
    }

    console.warn(TAG, `Manual URL health check failed: ${url}`);
    set({
      status: 'manual_entry',
      error: `Could not connect to server at ${input}. Check the address and try again.`,
    });
    return false;
  },

  /**
   * Switch to manual URL entry mode
   */
  showManualEntry: () => {
    console.log(TAG, 'Switching to manual entry mode');
    set({ status: 'manual_entry', error: null });
  },

  /**
   * Retry discovery from scratch
   */
  retry: async () => {
    console.log(TAG, 'Retrying discovery...');
    set({ error: null });
    await get().startDiscovery();
  },

  /**
   * Reset discovery — clears cached URL and returns to discovery flow
   */
  reset: async () => {
    console.log(TAG, 'Resetting discovery state...');
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_SERVER_URL);
      console.log(TAG, 'Cleared cached server URL');
    } catch {
      // Ignore storage errors
    }
    get().cleanup();
    set({
      status: 'idle',
      serverUrl: null,
      serverName: null,
      error: null,
      isResolved: false,
    });
    console.log(TAG, 'Reset complete, ready for re-discovery');
  },

  /**
   * Clean up discovery resources
   */
  cleanup: () => {
    const service = getDiscoveryService();
    service.cleanup();
  },
}));

// ============================================================================
// Selector Hooks (optimized for minimal re-renders)
// ============================================================================

export const useDiscoveryStatus = () => useDiscoveryStore((state) => state.status);
export const useServerUrl = () => useDiscoveryStore((state) => state.serverUrl);
export const useIsServerResolved = () => useDiscoveryStore((state) => state.isResolved);
export const useDiscoveryError = () => useDiscoveryStore((state) => state.error);
