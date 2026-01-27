/**
 * Translation hook for the Maestro Waiter App
 *
 * Provides easy access to translation utilities with the current language
 * preference from the settings store.
 */

import { useCallback, useMemo } from 'react';
import { useLanguage } from '../stores/settingsStore';
import type { Translation } from '../types/models';
import { getUIString } from '../lib/i18n';
import {
  getAvailableTranslations,
  getTranslatedText,
  hasAnyTranslation,
  matchesTranslation,
  type SupportedLanguage,
} from '../utils/translations';

/**
 * Hook for working with translations using the current language preference
 *
 * @returns Object with translation utilities bound to current language
 *
 * @example
 * const { t, language, matches } = useTranslation();
 *
 * // Get translated text with current language
 * const title = t(menuItem.title, 'Unknown');
 *
 * // Check if search matches
 * const found = matches(menuItem.title, searchQuery);
 */
export function useTranslation() {
  const language = useLanguage() as SupportedLanguage;

  /**
   * Get translated text using current language
   */
  const t = useCallback(
    (translation: Translation | undefined | null, fallback = ''): string => {
      return getTranslatedText(translation, fallback, language);
    },
    [language]
  );

  /**
   * Check if a query matches any translation
   */
  const matches = useCallback(
    (translation: Translation | undefined | null, query: string): boolean => {
      return matchesTranslation(translation, query);
    },
    []
  );

  /**
   * Check if translation has any content
   */
  const hasContent = useCallback((translation: Translation | undefined | null): boolean => {
    return hasAnyTranslation(translation);
  }, []);

  /**
   * Get all available translations
   */
  const getAvailable = useCallback((translation: Translation | undefined | null) => {
    return getAvailableTranslations(translation);
  }, []);

  /**
   * Look up a static UI string by dot-path key
   */
  const tUI = useCallback(
    (key: string): string => {
      return getUIString(key, language);
    },
    [language]
  );

  return useMemo(
    () => ({
      /** Current language code */
      language,
      /** Get translated text using current language */
      t,
      /** Look up a static UI string by key (e.g. 'tabs.tables') */
      tUI,
      /** Check if query matches any translation */
      matches,
      /** Check if translation has any content */
      hasContent,
      /** Get all available translations */
      getAvailable,
    }),
    [language, t, tUI, matches, hasContent, getAvailable]
  );
}

/**
 * Hook that returns only the translation function for simpler use cases
 *
 * @returns Translation function bound to current language
 *
 * @example
 * const t = useT();
 * const title = t(item.title);
 */
export function useT() {
  const language = useLanguage() as SupportedLanguage;

  return useCallback(
    (translation: Translation | undefined | null, fallback = ''): string => {
      return getTranslatedText(translation, fallback, language);
    },
    [language]
  );
}
