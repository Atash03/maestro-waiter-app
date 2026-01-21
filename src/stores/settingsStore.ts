/**
 * Settings Store for the Maestro Waiter App
 *
 * Features:
 * - Theme selection (light/dark/system)
 * - Language selection (en/ru/tm)
 * - Persistence using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// Storage keys
const STORAGE_KEYS = {
  THEME: 'maestro_theme',
  LANGUAGE: 'maestro_language',
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
 * Settings state interface
 */
export interface SettingsState {
  // State
  theme: ThemeMode;
  language: Language;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

/**
 * Load settings from storage
 */
async function loadSettings(): Promise<{
  theme: ThemeMode;
  language: Language;
}> {
  try {
    const [themeStr, languageStr] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.THEME),
      AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
    ]);

    return {
      theme: (themeStr as ThemeMode) ?? 'system',
      language: (languageStr as Language) ?? 'en',
    };
  } catch {
    // Return defaults on error
    return {
      theme: 'system',
      language: 'en',
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
    ]);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Settings store using Zustand
 */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial state
  theme: 'system',
  language: 'en',
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
   * Reset all settings to defaults
   */
  resetToDefaults: async () => {
    await clearSettings();
    set({
      theme: 'system',
      language: 'en',
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
 * Hook to check if settings are initialized
 */
export const useSettingsInitialized = () => useSettingsStore((state) => state.isInitialized);

/**
 * Hook to get settings actions
 */
export const useSettingsActions = () =>
  useSettingsStore(
    useShallow((state) => ({
      initialize: state.initialize,
      setTheme: state.setTheme,
      setLanguage: state.setLanguage,
      resetToDefaults: state.resetToDefaults,
    }))
  );
