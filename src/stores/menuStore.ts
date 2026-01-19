/**
 * Menu Store for the Maestro Waiter App
 *
 * Features:
 * - Cache menu categories and items
 * - Search/filter functionality
 * - Recently used items tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { getExtras } from '../services/api/extras';
import { getMenuCategories, getMenuItems } from '../services/api/menu';
import type { Extra, MenuCategory, MenuItem, Translation } from '../types/models';

/** Maximum number of recently used items to store */
const MAX_RECENT_ITEMS = 20;

/** AsyncStorage key for recently used items */
const RECENT_ITEMS_STORAGE_KEY = '@maestro_recent_menu_items';

/**
 * Menu store state interface
 */
export interface MenuState {
  // State
  categories: MenuCategory[];
  items: MenuItem[];
  extras: Extra[];
  selectedCategoryId: string | null;
  searchQuery: string;
  recentItemIds: string[];
  isLoadingCategories: boolean;
  isLoadingItems: boolean;
  isLoadingExtras: boolean;
  error: string | null;

  // Actions
  fetchCategories: () => Promise<void>;
  fetchItems: () => Promise<void>;
  fetchExtras: () => Promise<void>;
  fetchAll: () => Promise<void>;
  setCategories: (categories: MenuCategory[]) => void;
  setItems: (items: MenuItem[]) => void;
  setExtras: (extras: Extra[]) => void;
  selectCategory: (categoryId: string | null) => void;
  setSearchQuery: (query: string) => void;
  getCategoryById: (categoryId: string) => MenuCategory | undefined;
  getItemById: (itemId: string) => MenuItem | undefined;
  getExtraById: (extraId: string) => Extra | undefined;
  getItemsByCategory: (categoryId: string) => MenuItem[];
  getFilteredItems: () => MenuItem[];
  searchItems: (query: string) => MenuItem[];
  addToRecentItems: (itemId: string) => void;
  getRecentItems: () => MenuItem[];
  clearRecentItems: () => void;
  loadRecentItems: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Initial state values
 */
const initialState = {
  categories: [] as MenuCategory[],
  items: [] as MenuItem[],
  extras: [] as Extra[],
  selectedCategoryId: null as string | null,
  searchQuery: '',
  recentItemIds: [] as string[],
  isLoadingCategories: false,
  isLoadingItems: false,
  isLoadingExtras: false,
  error: null as string | null,
};

/**
 * Helper function to get translated text from Translation object
 */
export function getTranslatedText(
  translation: Translation | undefined,
  fallback = '',
  preferredLang = 'en'
): string {
  if (!translation) return fallback;
  if (preferredLang === 'ru' && translation.ru) return translation.ru;
  if (preferredLang === 'tm' && translation.tm) return translation.tm;
  return translation.en || translation.ru || translation.tm || fallback;
}

/**
 * Helper function to search within a translation object
 */
function matchesTranslation(translation: Translation | undefined, query: string): boolean {
  if (!translation) return false;
  const lowerQuery = query.toLowerCase();
  return (
    (translation.en ? translation.en.toLowerCase().includes(lowerQuery) : false) ||
    (translation.ru ? translation.ru.toLowerCase().includes(lowerQuery) : false) ||
    (translation.tm ? translation.tm.toLowerCase().includes(lowerQuery) : false)
  );
}

/**
 * Menu store using Zustand
 */
export const useMenuStore = create<MenuState>((set, get) => ({
  // Initial state
  ...initialState,

  /**
   * Fetch all menu categories from the API
   */
  fetchCategories: async () => {
    set({ isLoadingCategories: true, error: null });

    try {
      const response = await getMenuCategories();
      set({
        categories: response.data,
        isLoadingCategories: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch categories';
      set({
        error: message,
        isLoadingCategories: false,
      });
      throw error;
    }
  },

  /**
   * Fetch all menu items from the API
   */
  fetchItems: async () => {
    set({ isLoadingItems: true, error: null });

    try {
      const response = await getMenuItems({ isActive: true });
      set({
        items: response.data,
        isLoadingItems: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch menu items';
      set({
        error: message,
        isLoadingItems: false,
      });
      throw error;
    }
  },

  /**
   * Fetch all extras from the API
   */
  fetchExtras: async () => {
    set({ isLoadingExtras: true, error: null });

    try {
      const response = await getExtras({ isActive: true });
      set({
        extras: response.data,
        isLoadingExtras: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch extras';
      set({
        error: message,
        isLoadingExtras: false,
      });
      throw error;
    }
  },

  /**
   * Fetch all menu data (categories, items, extras)
   */
  fetchAll: async () => {
    const { fetchCategories, fetchItems, fetchExtras } = get();

    // Fetch all in parallel
    await Promise.all([fetchCategories(), fetchItems(), fetchExtras()]);
  },

  /**
   * Set categories directly (used for syncing from React Query)
   */
  setCategories: (categories: MenuCategory[]) => {
    set({ categories });
  },

  /**
   * Set items directly (used for syncing from React Query)
   */
  setItems: (items: MenuItem[]) => {
    set({ items });
  },

  /**
   * Set extras directly (used for syncing from React Query)
   */
  setExtras: (extras: Extra[]) => {
    set({ extras });
  },

  /**
   * Select a category by ID
   */
  selectCategory: (categoryId: string | null) => {
    set({ selectedCategoryId: categoryId });
  },

  /**
   * Set the search query
   */
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  /**
   * Get a category by ID
   */
  getCategoryById: (categoryId: string) => {
    const { categories } = get();

    // Search in top-level categories
    const topLevel = categories.find((c) => c.id === categoryId);
    if (topLevel) return topLevel;

    // Search in children (nested categories)
    for (const category of categories) {
      if (category.children) {
        const child = category.children.find((c) => c.id === categoryId);
        if (child) return child;
      }
    }

    return undefined;
  },

  /**
   * Get an item by ID
   */
  getItemById: (itemId: string) => {
    return get().items.find((item) => item.id === itemId);
  },

  /**
   * Get an extra by ID
   */
  getExtraById: (extraId: string) => {
    return get().extras.find((extra) => extra.id === extraId);
  },

  /**
   * Get all items in a specific category
   */
  getItemsByCategory: (categoryId: string) => {
    return get().items.filter((item) => item.categoryId === categoryId);
  },

  /**
   * Get filtered items based on selected category and search query
   */
  getFilteredItems: () => {
    const { items, selectedCategoryId, searchQuery } = get();

    let filteredItems = items;

    // Filter by category if selected
    if (selectedCategoryId) {
      filteredItems = filteredItems.filter((item) => item.categoryId === selectedCategoryId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      filteredItems = filteredItems.filter(
        (item) =>
          matchesTranslation(item.title, query) || matchesTranslation(item.description, query)
      );
    }

    return filteredItems;
  },

  /**
   * Search items by query (searches title and description)
   */
  searchItems: (query: string) => {
    const { items } = get();

    if (!query.trim()) return items;

    return items.filter(
      (item) => matchesTranslation(item.title, query) || matchesTranslation(item.description, query)
    );
  },

  /**
   * Add an item to recently used items
   */
  addToRecentItems: (itemId: string) => {
    const { recentItemIds } = get();

    // Remove item if it already exists (will be re-added at front)
    const newRecentIds = recentItemIds.filter((id) => id !== itemId);

    // Add to front of list
    newRecentIds.unshift(itemId);

    // Limit to max items
    const trimmedIds = newRecentIds.slice(0, MAX_RECENT_ITEMS);

    set({ recentItemIds: trimmedIds });

    // Persist to storage (fire and forget)
    AsyncStorage.setItem(RECENT_ITEMS_STORAGE_KEY, JSON.stringify(trimmedIds)).catch(() => {
      // Silently ignore storage errors
    });
  },

  /**
   * Get recently used menu items (as MenuItem objects)
   */
  getRecentItems: () => {
    const { items, recentItemIds } = get();

    // Map IDs to items, filtering out any that no longer exist
    return recentItemIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is MenuItem => item !== undefined);
  },

  /**
   * Clear recently used items
   */
  clearRecentItems: () => {
    set({ recentItemIds: [] });
    AsyncStorage.removeItem(RECENT_ITEMS_STORAGE_KEY).catch(() => {
      // Silently ignore storage errors
    });
  },

  /**
   * Load recently used items from storage
   */
  loadRecentItems: async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_ITEMS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          set({ recentItemIds: parsed });
        }
      }
    } catch {
      // Silently ignore storage errors
    }
  },

  /**
   * Clear any error message
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({ ...initialState, recentItemIds: [] });
  },
}));

/**
 * Hook to get all menu categories
 */
export const useMenuCategories = () => useMenuStore((state) => state.categories);

/**
 * Hook to get all menu items
 */
export const useMenuItems = () => useMenuStore((state) => state.items);

/**
 * Hook to get all extras
 */
export const useExtras = () => useMenuStore((state) => state.extras);

/**
 * Hook to get the selected category
 */
export const useSelectedCategory = () =>
  useMenuStore((state) => {
    if (!state.selectedCategoryId) return null;
    // Check top-level categories
    const topLevel = state.categories.find((c) => c.id === state.selectedCategoryId);
    if (topLevel) return topLevel;
    // Check children
    for (const category of state.categories) {
      if (category.children) {
        const child = category.children.find((c) => c.id === state.selectedCategoryId);
        if (child) return child;
      }
    }
    return null;
  });

/**
 * Hook to get the current search query
 */
export const useSearchQuery = () => useMenuStore((state) => state.searchQuery);

/**
 * Hook to get items filtered by selected category and search query
 */
export const useFilteredItems = () => {
  const items = useMenuStore((state) => state.items);
  const selectedCategoryId = useMenuStore((state) => state.selectedCategoryId);
  const searchQuery = useMenuStore((state) => state.searchQuery);

  let filteredItems = items;

  // Filter by category if selected
  if (selectedCategoryId) {
    filteredItems = filteredItems.filter((item) => item.categoryId === selectedCategoryId);
  }

  // Filter by search query
  if (searchQuery.trim()) {
    filteredItems = filteredItems.filter(
      (item) =>
        matchesTranslation(item.title, searchQuery) ||
        matchesTranslation(item.description, searchQuery)
    );
  }

  return filteredItems;
};

/**
 * Hook to get items in a specific category
 */
export const useItemsByCategory = (categoryId: string | null) => {
  const items = useMenuStore((state) => state.items);
  if (!categoryId) return items;
  return items.filter((item) => item.categoryId === categoryId);
};

/**
 * Hook to get recently used items
 */
export const useRecentItems = () => {
  const items = useMenuStore((state) => state.items);
  const recentItemIds = useMenuStore((state) => state.recentItemIds);

  return recentItemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is MenuItem => item !== undefined);
};

/**
 * Hook to get loading states
 */
export const useMenuLoading = () =>
  useMenuStore(
    useShallow((state) => ({
      isLoadingCategories: state.isLoadingCategories,
      isLoadingItems: state.isLoadingItems,
      isLoadingExtras: state.isLoadingExtras,
      isLoading: state.isLoadingCategories || state.isLoadingItems || state.isLoadingExtras,
    }))
  );

/**
 * Hook to get menu store error
 */
export const useMenuError = () => useMenuStore((state) => state.error);

/**
 * Hook to get selected category ID
 */
export const useSelectedCategoryId = () => useMenuStore((state) => state.selectedCategoryId);

/**
 * Hook to get recent item IDs
 */
export const useRecentItemIds = () => useMenuStore((state) => state.recentItemIds);
