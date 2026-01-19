/**
 * Offline Storage Service
 *
 * Handles persistence of critical data to AsyncStorage for offline support.
 * Caches menu items, categories, extras, tables, and zones.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Extra, MenuCategory, MenuItem, Table, Zone } from '../../types/models';

/** Storage keys for offline cache */
const STORAGE_KEYS = {
  MENU_CATEGORIES: '@maestro_offline_menu_categories',
  MENU_ITEMS: '@maestro_offline_menu_items',
  EXTRAS: '@maestro_offline_extras',
  TABLES: '@maestro_offline_tables',
  ZONES: '@maestro_offline_zones',
  CACHE_TIMESTAMPS: '@maestro_offline_cache_timestamps',
} as const;

/** Cache expiration times in milliseconds */
const CACHE_EXPIRY = {
  MENU_CATEGORIES: 24 * 60 * 60 * 1000, // 24 hours
  MENU_ITEMS: 24 * 60 * 60 * 1000, // 24 hours
  EXTRAS: 24 * 60 * 60 * 1000, // 24 hours
  TABLES: 6 * 60 * 60 * 1000, // 6 hours
  ZONES: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/** Cache timestamp record */
interface CacheTimestamps {
  menuCategories?: number;
  menuItems?: number;
  extras?: number;
  tables?: number;
  zones?: number;
}

/**
 * Get cache timestamps from storage
 */
async function getCacheTimestamps(): Promise<CacheTimestamps> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_TIMESTAMPS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Silently ignore storage errors
  }
  return {};
}

/**
 * Update cache timestamp for a specific key
 */
async function updateCacheTimestamp(
  key: keyof Omit<CacheTimestamps, 'lastUpdated'>
): Promise<void> {
  try {
    const timestamps = await getCacheTimestamps();
    timestamps[key] = Date.now();
    await AsyncStorage.setItem(STORAGE_KEYS.CACHE_TIMESTAMPS, JSON.stringify(timestamps));
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Check if cache is expired
 */
async function isCacheExpired(
  key: keyof typeof CACHE_EXPIRY,
  timestampKey: keyof CacheTimestamps
): Promise<boolean> {
  const timestamps = await getCacheTimestamps();
  const lastUpdated = timestamps[timestampKey];

  if (!lastUpdated) {
    return true;
  }

  const expiry = CACHE_EXPIRY[key];
  return Date.now() - lastUpdated > expiry;
}

// ============================================================================
// Menu Categories
// ============================================================================

/**
 * Save menu categories to offline storage
 */
export async function saveMenuCategoriesToCache(categories: MenuCategory[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MENU_CATEGORIES, JSON.stringify(categories));
    await updateCacheTimestamp('menuCategories');
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Load menu categories from offline storage
 */
export async function loadMenuCategoriesFromCache(): Promise<MenuCategory[] | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.MENU_CATEGORIES);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Silently ignore storage errors
  }
  return null;
}

/**
 * Check if menu categories cache is valid
 */
export async function isMenuCategoriesCacheValid(): Promise<boolean> {
  const expired = await isCacheExpired('MENU_CATEGORIES', 'menuCategories');
  return !expired;
}

// ============================================================================
// Menu Items
// ============================================================================

/**
 * Save menu items to offline storage
 */
export async function saveMenuItemsToCache(items: MenuItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
    await updateCacheTimestamp('menuItems');
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Load menu items from offline storage
 */
export async function loadMenuItemsFromCache(): Promise<MenuItem[] | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Silently ignore storage errors
  }
  return null;
}

/**
 * Check if menu items cache is valid
 */
export async function isMenuItemsCacheValid(): Promise<boolean> {
  const expired = await isCacheExpired('MENU_ITEMS', 'menuItems');
  return !expired;
}

// ============================================================================
// Extras
// ============================================================================

/**
 * Save extras to offline storage
 */
export async function saveExtrasToCache(extras: Extra[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.EXTRAS, JSON.stringify(extras));
    await updateCacheTimestamp('extras');
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Load extras from offline storage
 */
export async function loadExtrasFromCache(): Promise<Extra[] | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.EXTRAS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Silently ignore storage errors
  }
  return null;
}

/**
 * Check if extras cache is valid
 */
export async function isExtrasCacheValid(): Promise<boolean> {
  const expired = await isCacheExpired('EXTRAS', 'extras');
  return !expired;
}

// ============================================================================
// Tables
// ============================================================================

/**
 * Save tables to offline storage
 */
export async function saveTablesToCache(tables: Table[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
    await updateCacheTimestamp('tables');
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Load tables from offline storage
 */
export async function loadTablesFromCache(): Promise<Table[] | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.TABLES);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Silently ignore storage errors
  }
  return null;
}

/**
 * Check if tables cache is valid
 */
export async function isTablesCacheValid(): Promise<boolean> {
  const expired = await isCacheExpired('TABLES', 'tables');
  return !expired;
}

// ============================================================================
// Zones
// ============================================================================

/**
 * Save zones to offline storage
 */
export async function saveZonesToCache(zones: Zone[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(zones));
    await updateCacheTimestamp('zones');
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Load zones from offline storage
 */
export async function loadZonesFromCache(): Promise<Zone[] | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.ZONES);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Silently ignore storage errors
  }
  return null;
}

/**
 * Check if zones cache is valid
 */
export async function isZonesCacheValid(): Promise<boolean> {
  const expired = await isCacheExpired('ZONES', 'zones');
  return !expired;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all offline cache
 */
export async function clearOfflineCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.MENU_CATEGORIES,
      STORAGE_KEYS.MENU_ITEMS,
      STORAGE_KEYS.EXTRAS,
      STORAGE_KEYS.TABLES,
      STORAGE_KEYS.ZONES,
      STORAGE_KEYS.CACHE_TIMESTAMPS,
    ]);
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Get cache status for all data types
 */
export async function getCacheStatus(): Promise<{
  menuCategories: { hasData: boolean; isValid: boolean };
  menuItems: { hasData: boolean; isValid: boolean };
  extras: { hasData: boolean; isValid: boolean };
  tables: { hasData: boolean; isValid: boolean };
  zones: { hasData: boolean; isValid: boolean };
}> {
  const [categories, items, extras, tables, zones, timestamps] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.MENU_CATEGORIES),
    AsyncStorage.getItem(STORAGE_KEYS.MENU_ITEMS),
    AsyncStorage.getItem(STORAGE_KEYS.EXTRAS),
    AsyncStorage.getItem(STORAGE_KEYS.TABLES),
    AsyncStorage.getItem(STORAGE_KEYS.ZONES),
    getCacheTimestamps(),
  ]);

  const now = Date.now();

  return {
    menuCategories: {
      hasData: !!categories,
      isValid:
        !!timestamps.menuCategories &&
        now - timestamps.menuCategories < CACHE_EXPIRY.MENU_CATEGORIES,
    },
    menuItems: {
      hasData: !!items,
      isValid: !!timestamps.menuItems && now - timestamps.menuItems < CACHE_EXPIRY.MENU_ITEMS,
    },
    extras: {
      hasData: !!extras,
      isValid: !!timestamps.extras && now - timestamps.extras < CACHE_EXPIRY.EXTRAS,
    },
    tables: {
      hasData: !!tables,
      isValid: !!timestamps.tables && now - timestamps.tables < CACHE_EXPIRY.TABLES,
    },
    zones: {
      hasData: !!zones,
      isValid: !!timestamps.zones && now - timestamps.zones < CACHE_EXPIRY.ZONES,
    },
  };
}
