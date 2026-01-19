/**
 * Network Store - Manages network connectivity state
 *
 * Features:
 * - Real-time network connectivity tracking
 * - Online/offline status detection
 * - Network state change listeners
 * - Connection type information (wifi, cellular, etc.)
 */

import NetInfo, {
  type NetInfoState,
  type NetInfoSubscription,
} from '@react-native-community/netinfo';
import { create } from 'zustand';

export interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  isInitialized: boolean;
}

interface NetworkStore extends NetworkState {
  initialize: () => void;
  cleanup: () => void;
  checkConnection: () => Promise<void>;
}

let subscription: NetInfoSubscription | null = null;

export const useNetworkStore = create<NetworkStore>((set) => ({
  isConnected: null,
  isInternetReachable: null,
  connectionType: null,
  isInitialized: false,

  initialize: () => {
    if (subscription) {
      return; // Already initialized
    }

    // Subscribe to network state changes
    subscription = NetInfo.addEventListener((state: NetInfoState) => {
      set({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
        isInitialized: true,
      });
    });

    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      set({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
        isInitialized: true,
      });
    });
  },

  cleanup: () => {
    if (subscription) {
      subscription();
      subscription = null;
    }
    set({
      isConnected: null,
      isInternetReachable: null,
      connectionType: null,
      isInitialized: false,
    });
  },

  checkConnection: async () => {
    const state = await NetInfo.fetch();
    set({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      connectionType: state.type,
    });
  },
}));

// Selector for quick offline check
export const selectIsOffline = (state: NetworkStore): boolean => {
  return state.isInitialized && state.isConnected === false;
};

// Selector for checking if internet is reachable
export const selectIsInternetReachable = (state: NetworkStore): boolean | null => {
  return state.isInternetReachable;
};
