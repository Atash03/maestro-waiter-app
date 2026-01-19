/**
 * Translation utilities for the Maestro Waiter App
 *
 * Provides centralized functions for working with Translation objects
 * and language preferences throughout the application.
 */

import type { Translation } from '../types/models';

/**
 * Supported languages in the app
 */
export type SupportedLanguage = 'en' | 'ru' | 'tm';

/**
 * Default language fallback
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * Language display names for UI
 */
export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, string> = {
  en: 'English',
  ru: 'Русский',
  tm: 'Türkmençe',
};

/**
 * Get translated text from a Translation object
 *
 * This function extracts the appropriate translation based on the user's
 * preferred language. It falls back to other available translations if
 * the preferred language is not available.
 *
 * Fallback order: preferredLang -> en -> ru -> tm -> fallback
 *
 * @param translation - The Translation object containing multilingual text
 * @param fallback - Default text to return if no translation is available
 * @param preferredLang - The user's preferred language (defaults to 'en')
 * @returns The translated text or fallback
 *
 * @example
 * const title = getTranslatedText(menuItem.title, 'Unknown Item', 'ru');
 */
export function getTranslatedText(
  translation: Translation | undefined | null,
  fallback = '',
  preferredLang: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  if (!translation) return fallback;

  // Try preferred language first
  if (preferredLang === 'ru' && translation.ru) return translation.ru;
  if (preferredLang === 'tm' && translation.tm) return translation.tm;
  if (preferredLang === 'en' && translation.en) return translation.en;

  // Fallback chain: en -> ru -> tm -> fallback
  return translation.en || translation.ru || translation.tm || fallback;
}

/**
 * Check if a search query matches any language in a Translation object
 *
 * Performs case-insensitive matching across all languages in the Translation.
 *
 * @param translation - The Translation object to search within
 * @param query - The search query string
 * @returns True if the query matches any language translation
 *
 * @example
 * const matches = matchesTranslation(menuItem.title, 'pizza');
 */
export function matchesTranslation(
  translation: Translation | undefined | null,
  query: string
): boolean {
  if (!translation || !query) return false;

  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return false;

  return (
    translation.en?.toLowerCase().includes(lowerQuery) ||
    translation.ru?.toLowerCase().includes(lowerQuery) ||
    translation.tm?.toLowerCase().includes(lowerQuery) ||
    false
  );
}

/**
 * Create a Translation object from a single string
 *
 * Useful for creating Translation objects when you only have one language available.
 * Sets the provided text as all language values.
 *
 * @param text - The text to use for all languages
 * @returns A Translation object with the same text in all languages
 *
 * @example
 * const translation = createTranslation('Hello');
 * // { en: 'Hello', ru: 'Hello', tm: 'Hello' }
 */
export function createTranslation(text: string): Translation {
  return {
    en: text,
    ru: text,
    tm: text,
  };
}

/**
 * Create a partial Translation object
 *
 * Creates a Translation object with provided values, filling missing
 * languages with an empty string.
 *
 * @param values - Partial translation values
 * @returns A complete Translation object
 *
 * @example
 * const translation = createPartialTranslation({ en: 'Hello', ru: 'Привет' });
 * // { en: 'Hello', ru: 'Привет', tm: '' }
 */
export function createPartialTranslation(values: Partial<Translation>): Translation {
  return {
    en: values.en ?? '',
    ru: values.ru ?? '',
    tm: values.tm ?? '',
  };
}

/**
 * Check if a Translation object has any non-empty translations
 *
 * @param translation - The Translation object to check
 * @returns True if at least one language has a non-empty string
 *
 * @example
 * hasAnyTranslation({ en: '', ru: 'Привет', tm: '' }) // true
 * hasAnyTranslation({ en: '', ru: '', tm: '' }) // false
 */
export function hasAnyTranslation(translation: Translation | undefined | null): boolean {
  if (!translation) return false;
  return Boolean(translation.en || translation.ru || translation.tm);
}

/**
 * Get all available translations as an array
 *
 * Returns non-empty translations with their language codes.
 *
 * @param translation - The Translation object
 * @returns Array of { lang, text } objects for non-empty translations
 *
 * @example
 * getAvailableTranslations({ en: 'Hello', ru: 'Привет', tm: '' })
 * // [{ lang: 'en', text: 'Hello' }, { lang: 'ru', text: 'Привет' }]
 */
export function getAvailableTranslations(
  translation: Translation | undefined | null
): Array<{ lang: SupportedLanguage; text: string }> {
  if (!translation) return [];

  const available: Array<{ lang: SupportedLanguage; text: string }> = [];

  if (translation.en) available.push({ lang: 'en', text: translation.en });
  if (translation.ru) available.push({ lang: 'ru', text: translation.ru });
  if (translation.tm) available.push({ lang: 'tm', text: translation.tm });

  return available;
}
