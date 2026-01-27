/**
 * React Query hooks for Menu data fetching
 *
 * Provides optimized data fetching with caching, background refetching,
 * and pull-to-refresh support for menu categories, items, and extras.
 */

import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { getExtra, getExtras } from '../services/api/extras';
import {
  getMenuCategories,
  getMenuCategory,
  getMenuItem,
  getMenuItems,
} from '../services/api/menu';
import { useMenuStore } from '../stores/menuStore';
import type {
  GetExtraResponse,
  GetExtrasParams,
  GetExtrasResponse,
  GetMenuCategoriesParams,
  GetMenuCategoriesResponse,
  GetMenuCategoryResponse,
  GetMenuItemResponse,
  GetMenuItemsParams,
  GetMenuItemsResponse,
} from '../types/api';
import type { Extra, MenuItem } from '../types/models';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query key factory for menu categories
 * Enables targeted cache invalidation and updates
 */
export const menuCategoryQueryKeys = {
  all: ['menuCategories'] as const,
  lists: () => [...menuCategoryQueryKeys.all, 'list'] as const,
  list: (params?: GetMenuCategoriesParams) => [...menuCategoryQueryKeys.lists(), params] as const,
  details: () => [...menuCategoryQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...menuCategoryQueryKeys.details(), id] as const,
};

/**
 * Query key factory for menu items
 * Enables targeted cache invalidation and updates
 */
export const menuItemQueryKeys = {
  all: ['menuItems'] as const,
  lists: () => [...menuItemQueryKeys.all, 'list'] as const,
  list: (params?: GetMenuItemsParams) => [...menuItemQueryKeys.lists(), params] as const,
  details: () => [...menuItemQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...menuItemQueryKeys.details(), id] as const,
};

/**
 * Query key factory for extras
 * Enables targeted cache invalidation and updates
 */
export const extraQueryKeys = {
  all: ['extras'] as const,
  lists: () => [...extraQueryKeys.all, 'list'] as const,
  list: (params?: GetExtrasParams) => [...extraQueryKeys.lists(), params] as const,
  details: () => [...extraQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...extraQueryKeys.details(), id] as const,
};

// ============================================================================
// Default Query Options
// ============================================================================

/**
 * Default stale time for menu data (10 minutes)
 * Menu data changes less frequently than tables/orders
 */
const DEFAULT_STALE_TIME = 10 * 60 * 1000;

/**
 * Default cache time (60 minutes)
 * Menu data stays in cache longer due to infrequent changes
 */
const DEFAULT_GC_TIME = 60 * 60 * 1000;

// ============================================================================
// Menu Categories Hooks
// ============================================================================

/**
 * Options for useMenuCategories hook
 */
export interface UseMenuCategoriesOptions {
  /** Optional query parameters for filtering/pagination */
  params?: GetMenuCategoriesParams;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetMenuCategoriesResponse, Error, GetMenuCategoriesResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch all menu categories with optional filtering and pagination
 *
 * @example
 * ```tsx
 * // Fetch all categories
 * const { data, isLoading, refetch } = useMenuCategories();
 *
 * // Fetch only kitchen categories
 * const { data } = useMenuCategories({ params: { type: 'Kitchen' } });
 *
 * // With search
 * const { data } = useMenuCategories({ params: { search: 'Main' } });
 * ```
 */
export function useMenuCategories(
  options?: UseMenuCategoriesOptions
): UseQueryResult<GetMenuCategoriesResponse, Error> {
  const { params, queryOptions } = options ?? {};

  return useQuery({
    queryKey: menuCategoryQueryKeys.list(params),
    queryFn: () => getMenuCategories(params),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...queryOptions,
  });
}

/**
 * Options for useMenuCategory hook
 */
export interface UseMenuCategoryOptions {
  /** Category ID to fetch */
  id: string;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetMenuCategoryResponse, Error, GetMenuCategoryResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch a single menu category by ID
 *
 * @example
 * ```tsx
 * const { data: category, isLoading } = useMenuCategory({ id: 'cat-123' });
 * ```
 */
export function useMenuCategory(
  options: UseMenuCategoryOptions
): UseQueryResult<GetMenuCategoryResponse, Error> {
  const { id, queryOptions } = options;

  return useQuery({
    queryKey: menuCategoryQueryKeys.detail(id),
    queryFn: () => getMenuCategory(id),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: Boolean(id),
    ...queryOptions,
  });
}

// ============================================================================
// Menu Items Hooks
// ============================================================================

/**
 * Options for useMenuItems hook
 */
export interface UseMenuItemsOptions {
  /** Optional query parameters for filtering/pagination */
  params?: GetMenuItemsParams;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetMenuItemsResponse, Error, GetMenuItemsResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch all menu items with optional filtering and pagination
 *
 * @example
 * ```tsx
 * // Fetch all items
 * const { data, isLoading, refetch } = useMenuItems();
 *
 * // Fetch active items only
 * const { data } = useMenuItems({ params: { isActive: true } });
 *
 * // Fetch items by category
 * const { data } = useMenuItems({ params: { categoryId: 'cat-123' } });
 *
 * // With search
 * const { data } = useMenuItems({ params: { search: 'Pizza' } });
 * ```
 */
export function useMenuItems(
  options?: UseMenuItemsOptions
): UseQueryResult<GetMenuItemsResponse, Error> {
  const { params, queryOptions } = options ?? {};

  return useQuery({
    queryKey: menuItemQueryKeys.list(params),
    queryFn: () => getMenuItems(params),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...queryOptions,
  });
}

/**
 * Options for useMenuItem hook
 */
export interface UseMenuItemOptions {
  /** Item ID to fetch */
  id: string;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetMenuItemResponse, Error, GetMenuItemResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch a single menu item by ID
 *
 * @example
 * ```tsx
 * const { data: item, isLoading } = useMenuItem({ id: 'item-123' });
 * ```
 */
export function useMenuItem(
  options: UseMenuItemOptions
): UseQueryResult<GetMenuItemResponse, Error> {
  const { id, queryOptions } = options;

  return useQuery({
    queryKey: menuItemQueryKeys.detail(id),
    queryFn: () => getMenuItem(id),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: Boolean(id),
    ...queryOptions,
  });
}

// ============================================================================
// Extras Hooks
// ============================================================================

/**
 * Options for useExtras hook
 */
export interface UseExtrasOptions {
  /** Optional query parameters for filtering/pagination */
  params?: GetExtrasParams;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetExtrasResponse, Error, GetExtrasResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch all extras with optional filtering and pagination
 *
 * @example
 * ```tsx
 * // Fetch all extras
 * const { data, isLoading, refetch } = useExtras();
 *
 * // Fetch active extras only
 * const { data } = useExtras({ params: { isActive: true } });
 *
 * // With search
 * const { data } = useExtras({ params: { search: 'Cheese' } });
 * ```
 */
export function useExtras(options?: UseExtrasOptions): UseQueryResult<GetExtrasResponse, Error> {
  const { params, queryOptions } = options ?? {};

  return useQuery({
    queryKey: extraQueryKeys.list(params),
    queryFn: () => getExtras(params),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...queryOptions,
  });
}

/**
 * Options for useExtra hook
 */
export interface UseExtraOptions {
  /** Extra ID to fetch */
  id: string;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetExtraResponse, Error, GetExtraResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch a single extra by ID
 *
 * @example
 * ```tsx
 * const { data: extra, isLoading } = useExtra({ id: 'extra-123' });
 * ```
 */
export function useExtra(options: UseExtraOptions): UseQueryResult<GetExtraResponse, Error> {
  const { id, queryOptions } = options;

  return useQuery({
    queryKey: extraQueryKeys.detail(id),
    queryFn: () => getExtra(id),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: Boolean(id),
    ...queryOptions,
  });
}

// ============================================================================
// Combined Hooks
// ============================================================================

/**
 * Result type for useMenuData hook
 */
export interface MenuDataResult {
  /** Categories query result */
  categories: UseQueryResult<GetMenuCategoriesResponse, Error>;
  /** Items query result */
  items: UseQueryResult<GetMenuItemsResponse, Error>;
  /** Extras query result */
  extras: UseQueryResult<GetExtrasResponse, Error>;
  /** Combined loading state (true if any is loading) */
  isLoading: boolean;
  /** Combined error (first error encountered) */
  error: Error | null;
  /** Refetch all menu data */
  refetchAll: () => Promise<void>;
}

/**
 * Options for useMenuData hook
 */
export interface UseMenuDataOptions {
  /** Optional category query parameters */
  categoryParams?: GetMenuCategoriesParams;
  /** Optional item query parameters */
  itemParams?: GetMenuItemsParams;
  /** Optional extra query parameters */
  extraParams?: GetExtrasParams;
  /** Whether to sync data to the menu store (default: true) */
  syncToStore?: boolean;
}

/**
 * Fetch all menu data (categories, items, extras) together
 * Useful for order entry screens that need the complete menu
 *
 * @example
 * ```tsx
 * const { categories, items, extras, isLoading, refetchAll } = useMenuData();
 *
 * // Pull to refresh
 * <RefreshControl refreshing={isLoading} onRefresh={refetchAll} />
 *
 * // With active items filter
 * const { items } = useMenuData({ itemParams: { isActive: true } });
 * ```
 */
export function useMenuData(options?: UseMenuDataOptions): MenuDataResult {
  const { categoryParams, itemParams, extraParams, syncToStore = true } = options ?? {};

  const categories = useMenuCategories({ params: categoryParams });
  const items = useMenuItems({ params: itemParams });
  const extras = useExtras({ params: extraParams });

  // Select only the setter functions (stable references) to avoid infinite loops
  const setCategories = useMenuStore((state) => state.setCategories);
  const setItems = useMenuStore((state) => state.setItems);
  const setExtras = useMenuStore((state) => state.setExtras);

  // Sync data to the menu store when data is fetched
  useEffect(() => {
    if (syncToStore && categories.data?.data) {
      setCategories(categories.data.data);
    }
  }, [syncToStore, categories.data, setCategories]);

  useEffect(() => {
    if (syncToStore && items.data?.data) {
      setItems(items.data.data);
    }
  }, [syncToStore, items.data, setItems]);

  useEffect(() => {
    if (syncToStore && extras.data?.data) {
      setExtras(extras.data.data);
    }
  }, [syncToStore, extras.data, setExtras]);

  const isLoading = categories.isLoading || items.isLoading || extras.isLoading;
  const error = categories.error ?? items.error ?? extras.error;

  const refetchAll = useCallback(async () => {
    await Promise.all([categories.refetch(), items.refetch(), extras.refetch()]);
  }, [categories, items, extras]);

  return {
    categories,
    items,
    extras,
    isLoading,
    error,
    refetchAll,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get menu items filtered by category ID from cached data
 * Uses existing cache without making additional requests
 *
 * @example
 * ```tsx
 * const { data } = useMenuItems();
 * const itemsInCategory = useMenuItemsByCategory(data?.data, 'cat-123');
 * ```
 */
export function useMenuItemsByCategory(
  items: MenuItem[] | undefined,
  categoryId: string | undefined
): MenuItem[] {
  if (!items || !categoryId) {
    return items ?? [];
  }
  return items.filter((item) => item.categoryId === categoryId);
}

/**
 * Hook to search menu items by name or description from cached data
 * Uses existing cache without making additional requests
 *
 * @example
 * ```tsx
 * const { data } = useMenuItems();
 * const searchResults = useMenuItemSearch(data?.data, 'pizza');
 * ```
 */
export function useMenuItemSearch(
  items: MenuItem[] | undefined,
  query: string | undefined
): MenuItem[] {
  if (!items || !query || query.trim() === '') {
    return items ?? [];
  }

  const lowerQuery = query.toLowerCase().trim();
  return items.filter((item) => {
    // Search in title (all languages)
    const titleMatch =
      item.title.en?.toLowerCase().includes(lowerQuery) ||
      item.title.ru?.toLowerCase().includes(lowerQuery) ||
      item.title.tm?.toLowerCase().includes(lowerQuery);

    // Search in description (all languages)
    const descMatch =
      item.description?.en?.toLowerCase().includes(lowerQuery) ||
      item.description?.ru?.toLowerCase().includes(lowerQuery) ||
      item.description?.tm?.toLowerCase().includes(lowerQuery);

    return titleMatch || descMatch;
  });
}

/**
 * Hook to get active menu items only from cached data
 *
 * @example
 * ```tsx
 * const { data } = useMenuItems();
 * const activeItems = useActiveMenuItems(data?.data);
 * ```
 */
export function useActiveMenuItems(items: MenuItem[] | undefined): MenuItem[] {
  if (!items) {
    return [];
  }
  return items.filter((item) => item.isActive);
}

/**
 * Hook to get extras for a specific menu item
 * Filters available extras based on item's extra IDs
 *
 * @example
 * ```tsx
 * const { data: extras } = useExtras();
 * const itemExtras = useExtrasForItem(extras?.data, item.extraIds);
 * ```
 */
export function useExtrasForItem(
  extras: Extra[] | undefined,
  extraIds: string[] | undefined
): Extra[] {
  if (!extras || !extraIds || extraIds.length === 0) {
    return [];
  }
  const extraIdSet = new Set(extraIds);
  return extras.filter((extra) => extraIdSet.has(extra.id));
}

/**
 * Hook for cache invalidation and prefetching
 *
 * @example
 * ```tsx
 * const { invalidateItems, prefetchAll, invalidateAll } = useMenuCacheActions();
 *
 * // Invalidate after mutation
 * await updateMenuItem(id, data);
 * invalidateItems();
 *
 * // Prefetch for navigation
 * prefetchItems({ categoryId: 'cat-123' });
 * ```
 */
export function useMenuCacheActions() {
  const queryClient = useQueryClient();

  const invalidateCategories = useCallback(
    (params?: GetMenuCategoriesParams) => {
      if (params) {
        queryClient.invalidateQueries({ queryKey: menuCategoryQueryKeys.list(params) });
      } else {
        queryClient.invalidateQueries({ queryKey: menuCategoryQueryKeys.all });
      }
    },
    [queryClient]
  );

  const invalidateItems = useCallback(
    (params?: GetMenuItemsParams) => {
      if (params) {
        queryClient.invalidateQueries({ queryKey: menuItemQueryKeys.list(params) });
      } else {
        queryClient.invalidateQueries({ queryKey: menuItemQueryKeys.all });
      }
    },
    [queryClient]
  );

  const invalidateExtras = useCallback(
    (params?: GetExtrasParams) => {
      if (params) {
        queryClient.invalidateQueries({ queryKey: extraQueryKeys.list(params) });
      } else {
        queryClient.invalidateQueries({ queryKey: extraQueryKeys.all });
      }
    },
    [queryClient]
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: menuCategoryQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: menuItemQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: extraQueryKeys.all });
  }, [queryClient]);

  const prefetchCategories = useCallback(
    async (params?: GetMenuCategoriesParams) => {
      await queryClient.prefetchQuery({
        queryKey: menuCategoryQueryKeys.list(params),
        queryFn: () => getMenuCategories(params),
        staleTime: DEFAULT_STALE_TIME,
      });
    },
    [queryClient]
  );

  const prefetchItems = useCallback(
    async (params?: GetMenuItemsParams) => {
      await queryClient.prefetchQuery({
        queryKey: menuItemQueryKeys.list(params),
        queryFn: () => getMenuItems(params),
        staleTime: DEFAULT_STALE_TIME,
      });
    },
    [queryClient]
  );

  const prefetchExtras = useCallback(
    async (params?: GetExtrasParams) => {
      await queryClient.prefetchQuery({
        queryKey: extraQueryKeys.list(params),
        queryFn: () => getExtras(params),
        staleTime: DEFAULT_STALE_TIME,
      });
    },
    [queryClient]
  );

  const prefetchAll = useCallback(async () => {
    await Promise.all([prefetchCategories(), prefetchItems(), prefetchExtras()]);
  }, [prefetchCategories, prefetchItems, prefetchExtras]);

  return {
    invalidateCategories,
    invalidateItems,
    invalidateExtras,
    invalidateAll,
    prefetchCategories,
    prefetchItems,
    prefetchExtras,
    prefetchAll,
  };
}
