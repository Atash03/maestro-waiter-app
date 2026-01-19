/**
 * Settings Store for the Maestro Waiter App
 *
 * Features:
 * - Theme selection (light/dark/system)
 * - Language selection (en/ru/tm)
 * - Default floor plan zoom level
 * - Persistence using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// Storage keys
const STORAGE_KEYS = {
  THEME: 'maestro_theme',
  LANGUAGE: 'maestro_language',
  FLOOR_PLAN_ZOOM: 'maestro_floor_plan_zoom',
} as const;

/**
 * Theme options
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Supported languages
 */
export type Language = 'en' | 'ru' | 'tm';

/**
 * Language display names
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  tm: 'Türkmençe',
};

/**
 * Theme display names
 */
export const THEME_NAMES: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

/**
 * Floor plan zoom level constraints
 */
export const ZOOM_CONSTRAINTS = {
  MIN: 0.5,
  MAX: 2.0,
  DEFAULT: 1.0,
  STEP: 0.1,
} as const;

/**
 * Settings state interface
 */
export interface SettingsState {
  // State
  theme: ThemeMode;
  language: Language;
  floorPlanZoom: number;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  setFloorPlanZoom: (zoom: number) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

/**
 * Load settings from storage
 */
async function loadSettings(): Promise<{
  theme: ThemeMode;
  language: Language;
  floorPlanZoom: number;
}> {
  try {
    const [themeStr, languageStr, zoomStr] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.THEME),
      AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
      AsyncStorage.getItem(STORAGE_KEYS.FLOOR_PLAN_ZOOM),
    ]);

    return {
      theme: (themeStr as ThemeMode) ?? 'system',
      language: (languageStr as Language) ?? 'en',
      floorPlanZoom: zoomStr ? Number.parseFloat(zoomStr) : ZOOM_CONSTRAINTS.DEFAULT,
    };
  } catch {
    // Return defaults on error
    return {
      theme: 'system',
      language: 'en',
      floorPlanZoom: ZOOM_CONSTRAINTS.DEFAULT,
    };
  }
}

/**
 * Save a setting to storage
 */
async function saveSetting(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all settings from storage
 */
async function clearSettings(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.THEME),
      AsyncStorage.removeItem(STORAGE_KEYS.LANGUAGE),
      AsyncStorage.removeItem(STORAGE_KEYS.FLOOR_PLAN_ZOOM),
    ]);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clamp zoom value to valid range
 */
function clampZoom(zoom: number): number {
  return Math.max(ZOOM_CONSTRAINTS.MIN, Math.min(ZOOM_CONSTRAINTS.MAX, zoom));
}

/**
 * Settings store using Zustand
 */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial state
  theme: 'system',
  language: 'en',
  floorPlanZoom: ZOOM_CONSTRAINTS.DEFAULT,
  isInitialized: false,

  /**
   * Initialize the settings store
   * Loads settings from storage
   */
  initialize: async () => {
    if (get().isInitialized) return;

    const settings = await loadSettings();
    set({
      theme: settings.theme,
      language: settings.language,
      floorPlanZoom: settings.floorPlanZoom,
      isInitialized: true,
    });
  },

  /**
   * Set theme preference
   */
  setTheme: async (theme: ThemeMode) => {
    await saveSetting(STORAGE_KEYS.THEME, theme);
    set({ theme });
  },

  /**
   * Set language preference
   */
  setLanguage: async (language: Language) => {
    await saveSetting(STORAGE_KEYS.LANGUAGE, language);
    set({ language });
  },

  /**
   * Set floor plan zoom level
   */
  setFloorPlanZoom: async (zoom: number) => {
    const clampedZoom = clampZoom(zoom);
    await saveSetting(STORAGE_KEYS.FLOOR_PLAN_ZOOM, clampedZoom.toString());
    set({ floorPlanZoom: clampedZoom });
  },

  /**
   * Reset all settings to defaults
   */
  resetToDefaults: async () => {
    await clearSettings();
    set({
      theme: 'system',
      language: 'en',
      floorPlanZoom: ZOOM_CONSTRAINTS.DEFAULT,
    });
  },
}));

// ============================================================================
// Selector Hooks (optimized for minimal re-renders)
// ============================================================================

/**
 * Hook to get current theme
 */
export const useTheme = () => useSettingsStore((state) => state.theme);

/**
 * Hook to get current language
 */
export const useLanguage = () => useSettingsStore((state) => state.language);

/**
 * Hook to get floor plan zoom level
 */
export const useFloorPlanZoom = () => useSettingsStore((state) => state.floorPlanZoom);

/**
 * Hook to check if settings are initialized
 */
export const useSettingsInitialized = () => useSettingsStore((state) => state.isInitialized);

/**
 * Hook to get settings actions
 */
export const useSettingsActions = () =>
  useSettingsStore((state) => ({
    initialize: state.initialize,
    setTheme: state.setTheme,
    setLanguage: state.setLanguage,
    setFloorPlanZoom: state.setFloorPlanZoom,
    resetToDefaults: state.resetToDefaults,
  }));
