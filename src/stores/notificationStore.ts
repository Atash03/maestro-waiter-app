/**
 * Notification Store for the Maestro Waiter App
 *
 * Features:
 * - Store active waiter calls
 * - Track acknowledged vs pending calls
 * - Badge count for unread
 * - Sound/vibration preferences
 * - Integration with SSE events for real-time updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  WaiterCallAcknowledgedEvent,
  WaiterCallCancelledEvent,
  WaiterCallCompletedEvent,
  WaiterCallEvent,
} from '../types/api';
import { WaiterCallStatus } from '../types/enums';

// Storage keys
const STORAGE_KEYS = {
  SOUND_ENABLED: 'maestro_notification_sound',
  VIBRATION_ENABLED: 'maestro_notification_vibration',
} as const;

/**
 * Normalized waiter call for the notification store
 */
export interface NotificationCall {
  id: string;
  tableId: string;
  tableTitle: string;
  zoneName: string;
  zoneId: string;
  waiterId: string | null;
  status: WaiterCallStatus;
  reason?: string;
  createdAt: string;
  acknowledgedAt: string | null;
  completedAt: string | null;
  isRead: boolean;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

/**
 * Notification state interface
 */
export interface NotificationState {
  // State
  calls: NotificationCall[];
  preferences: NotificationPreferences;
  isInitialized: boolean;

  // Computed getters (as functions)
  getPendingCalls: () => NotificationCall[];
  getAcknowledgedCalls: () => NotificationCall[];
  getCompletedCalls: () => NotificationCall[];
  getActiveCalls: () => NotificationCall[];
  getUnreadCount: () => number;
  getBadgeCount: () => number;
  getCallById: (id: string) => NotificationCall | undefined;

  // Actions
  initialize: () => Promise<void>;

  // Call management
  addCall: (event: WaiterCallEvent, reason?: string) => void;
  acknowledgeCall: (event: WaiterCallAcknowledgedEvent) => void;
  completeCall: (event: WaiterCallCompletedEvent) => void;
  cancelCall: (event: WaiterCallCancelledEvent) => void;
  markCallAsRead: (callId: string) => void;
  markAllAsRead: () => void;
  removeCall: (callId: string) => void;
  clearCompletedCalls: () => void;
  clearAllCalls: () => void;

  // Preferences
  setSoundEnabled: (enabled: boolean) => Promise<void>;
  setVibrationEnabled: (enabled: boolean) => Promise<void>;
}

/**
 * Load notification preferences from storage
 */
async function loadPreferences(): Promise<NotificationPreferences> {
  try {
    const [soundStr, vibrationStr] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.SOUND_ENABLED),
      AsyncStorage.getItem(STORAGE_KEYS.VIBRATION_ENABLED),
    ]);

    return {
      soundEnabled: soundStr !== null ? JSON.parse(soundStr) : true,
      vibrationEnabled: vibrationStr !== null ? JSON.parse(vibrationStr) : true,
    };
  } catch {
    // Return defaults on error
    return {
      soundEnabled: true,
      vibrationEnabled: true,
    };
  }
}

/**
 * Save a preference to storage
 */
async function savePreference(key: string, value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Notification store using Zustand
 */
export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  calls: [],
  preferences: {
    soundEnabled: true,
    vibrationEnabled: true,
  },
  isInitialized: false,

  // Computed getters
  getPendingCalls: () => {
    return get().calls.filter((call) => call.status === WaiterCallStatus.PENDING);
  },

  getAcknowledgedCalls: () => {
    return get().calls.filter((call) => call.status === WaiterCallStatus.ACKNOWLEDGED);
  },

  getCompletedCalls: () => {
    return get().calls.filter((call) => call.status === WaiterCallStatus.COMPLETED);
  },

  getActiveCalls: () => {
    return get().calls.filter(
      (call) =>
        call.status === WaiterCallStatus.PENDING || call.status === WaiterCallStatus.ACKNOWLEDGED
    );
  },

  getUnreadCount: () => {
    return get().calls.filter((call) => !call.isRead && call.status === WaiterCallStatus.PENDING)
      .length;
  },

  getBadgeCount: () => {
    // Badge shows pending (unacknowledged) calls
    return get().getPendingCalls().length;
  },

  getCallById: (id: string) => {
    return get().calls.find((call) => call.id === id);
  },

  /**
   * Initialize the notification store
   * Loads preferences from storage
   */
  initialize: async () => {
    if (get().isInitialized) return;

    const preferences = await loadPreferences();
    set({ preferences, isInitialized: true });
  },

  /**
   * Add a new waiter call from SSE event
   */
  addCall: (event: WaiterCallEvent, reason?: string) => {
    const { calls } = get();

    // Check if call already exists
    const existingIndex = calls.findIndex((c) => c.id === event.callId);
    if (existingIndex !== -1) {
      // Update existing call if found
      const updatedCalls = [...calls];
      updatedCalls[existingIndex] = {
        ...updatedCalls[existingIndex],
        waiterId: event.waiterId,
        status: WaiterCallStatus.PENDING,
      };
      set({ calls: updatedCalls });
      return;
    }

    const newCall: NotificationCall = {
      id: event.callId,
      tableId: event.tableId,
      tableTitle: event.tableTitle,
      zoneName: event.zoneName,
      zoneId: event.zoneId,
      waiterId: event.waiterId,
      status: WaiterCallStatus.PENDING,
      reason,
      createdAt: event.timestamp,
      acknowledgedAt: null,
      completedAt: null,
      isRead: false,
    };

    // Add to beginning of list (newest first)
    set({ calls: [newCall, ...calls] });
  },

  /**
   * Update call status to acknowledged
   */
  acknowledgeCall: (event: WaiterCallAcknowledgedEvent) => {
    const { calls } = get();
    const updatedCalls = calls.map((call) =>
      call.id === event.callId
        ? {
            ...call,
            status: WaiterCallStatus.ACKNOWLEDGED,
            waiterId: event.waiterId,
            acknowledgedAt: event.timestamp,
            isRead: true,
          }
        : call
    );
    set({ calls: updatedCalls });
  },

  /**
   * Update call status to completed
   */
  completeCall: (event: WaiterCallCompletedEvent) => {
    const { calls } = get();
    const updatedCalls = calls.map((call) =>
      call.id === event.callId
        ? {
            ...call,
            status: WaiterCallStatus.COMPLETED,
            waiterId: event.waiterId,
            completedAt: event.timestamp,
            isRead: true,
          }
        : call
    );
    set({ calls: updatedCalls });
  },

  /**
   * Update call status to cancelled (remove from list)
   */
  cancelCall: (event: WaiterCallCancelledEvent) => {
    const { calls } = get();
    // Remove cancelled calls from the list
    const updatedCalls = calls.filter((call) => call.id !== event.callId);
    set({ calls: updatedCalls });
  },

  /**
   * Mark a specific call as read
   */
  markCallAsRead: (callId: string) => {
    const { calls } = get();
    const updatedCalls = calls.map((call) =>
      call.id === callId ? { ...call, isRead: true } : call
    );
    set({ calls: updatedCalls });
  },

  /**
   * Mark all calls as read
   */
  markAllAsRead: () => {
    const { calls } = get();
    const updatedCalls = calls.map((call) => ({ ...call, isRead: true }));
    set({ calls: updatedCalls });
  },

  /**
   * Remove a specific call from the list
   */
  removeCall: (callId: string) => {
    const { calls } = get();
    const updatedCalls = calls.filter((call) => call.id !== callId);
    set({ calls: updatedCalls });
  },

  /**
   * Clear all completed calls
   */
  clearCompletedCalls: () => {
    const { calls } = get();
    const updatedCalls = calls.filter((call) => call.status !== WaiterCallStatus.COMPLETED);
    set({ calls: updatedCalls });
  },

  /**
   * Clear all calls (used on logout)
   */
  clearAllCalls: () => {
    set({ calls: [] });
  },

  /**
   * Set sound notification preference
   */
  setSoundEnabled: async (enabled: boolean) => {
    await savePreference(STORAGE_KEYS.SOUND_ENABLED, enabled);
    set((state) => ({
      preferences: { ...state.preferences, soundEnabled: enabled },
    }));
  },

  /**
   * Set vibration notification preference
   */
  setVibrationEnabled: async (enabled: boolean) => {
    await savePreference(STORAGE_KEYS.VIBRATION_ENABLED, enabled);
    set((state) => ({
      preferences: { ...state.preferences, vibrationEnabled: enabled },
    }));
  },
}));

// ============================================================================
// Selector Hooks (optimized for minimal re-renders)
// ============================================================================

/**
 * Hook to get all calls
 */
export const useCalls = () => useNotificationStore((state) => state.calls);

/**
 * Hook to get pending calls
 */
export const usePendingCalls = () => {
  const calls = useNotificationStore((state) => state.calls);
  return calls.filter((call) => call.status === WaiterCallStatus.PENDING);
};

/**
 * Hook to get acknowledged calls
 */
export const useAcknowledgedCalls = () => {
  const calls = useNotificationStore((state) => state.calls);
  return calls.filter((call) => call.status === WaiterCallStatus.ACKNOWLEDGED);
};

/**
 * Hook to get active calls (pending + acknowledged)
 */
export const useActiveCalls = () => {
  const calls = useNotificationStore((state) => state.calls);
  return calls.filter(
    (call) =>
      call.status === WaiterCallStatus.PENDING || call.status === WaiterCallStatus.ACKNOWLEDGED
  );
};

/**
 * Hook to get unread count
 */
export const useUnreadCount = () => {
  const calls = useNotificationStore((state) => state.calls);
  return calls.filter((call) => !call.isRead && call.status === WaiterCallStatus.PENDING).length;
};

/**
 * Hook to get badge count (pending calls)
 */
export const useBadgeCount = () => {
  const calls = useNotificationStore((state) => state.calls);
  return calls.filter((call) => call.status === WaiterCallStatus.PENDING).length;
};

/**
 * Hook to get notification preferences
 */
export const useNotificationPreferences = () => useNotificationStore((state) => state.preferences);

/**
 * Hook to check if sound is enabled
 */
export const useSoundEnabled = () =>
  useNotificationStore((state) => state.preferences.soundEnabled);

/**
 * Hook to check if vibration is enabled
 */
export const useVibrationEnabled = () =>
  useNotificationStore((state) => state.preferences.vibrationEnabled);

/**
 * Hook to get notification actions
 */
export const useNotificationActions = () =>
  useNotificationStore(
    useShallow((state) => ({
      initialize: state.initialize,
      addCall: state.addCall,
      acknowledgeCall: state.acknowledgeCall,
      completeCall: state.completeCall,
      cancelCall: state.cancelCall,
      markCallAsRead: state.markCallAsRead,
      markAllAsRead: state.markAllAsRead,
      removeCall: state.removeCall,
      clearCompletedCalls: state.clearCompletedCalls,
      clearAllCalls: state.clearAllCalls,
      setSoundEnabled: state.setSoundEnabled,
      setVibrationEnabled: state.setVibrationEnabled,
    }))
  );

/**
 * Hook to get a specific call by ID
 */
export const useCallById = (callId: string) => {
  const calls = useNotificationStore((state) => state.calls);
  return calls.find((call) => call.id === callId);
};

/**
 * Hook to check if store is initialized
 */
export const useNotificationInitialized = () =>
  useNotificationStore((state) => state.isInitialized);
