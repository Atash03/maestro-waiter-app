/**
 * React Query hooks for Tables and Zones data fetching
 *
 * Provides optimized data fetching with caching, background refetching,
 * and pull-to-refresh support for tables and zones data.
 */

import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { getTable, getTables } from '../services/api/tables';
import { getZone, getZones } from '../services/api/zones';
import type {
  GetTableResponse,
  GetTablesParams,
  GetTablesResponse,
  GetZoneResponse,
  GetZonesParams,
  GetZonesResponse,
} from '../types/api';
import type { Table } from '../types/models';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query key factory for tables and zones
 * Enables targeted cache invalidation and updates
 */
export const tableQueryKeys = {
  all: ['tables'] as const,
  lists: () => [...tableQueryKeys.all, 'list'] as const,
  list: (params?: GetTablesParams) => [...tableQueryKeys.lists(), params] as const,
  details: () => [...tableQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...tableQueryKeys.details(), id] as const,
};

export const zoneQueryKeys = {
  all: ['zones'] as const,
  lists: () => [...zoneQueryKeys.all, 'list'] as const,
  list: (params?: GetZonesParams) => [...zoneQueryKeys.lists(), params] as const,
  details: () => [...zoneQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...zoneQueryKeys.details(), id] as const,
};

// ============================================================================
// Default Query Options
// ============================================================================

/**
 * Default stale time for tables/zones data (5 minutes)
 * Data is considered fresh for 5 minutes before background refetch
 */
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

/**
 * Default cache time (30 minutes)
 * Data stays in cache for 30 minutes after last use
 */
const DEFAULT_GC_TIME = 30 * 60 * 1000;

// ============================================================================
// Tables Hooks
// ============================================================================

/**
 * Options for useTables hook
 */
export interface UseTablesOptions {
  /** Optional query parameters for filtering/pagination */
  params?: GetTablesParams;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetTablesResponse, Error, GetTablesResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch all tables with optional filtering and pagination
 *
 * @example
 * ```tsx
 * // Fetch all tables
 * const { data, isLoading, refetch } = useTables();
 *
 * // Fetch tables for a specific zone
 * const { data } = useTables({ params: { zoneId: 'zone-123' } });
 *
 * // With search
 * const { data } = useTables({ params: { search: 'VIP' } });
 * ```
 */
export function useTables(options?: UseTablesOptions): UseQueryResult<GetTablesResponse, Error> {
  const { params, queryOptions } = options ?? {};

  return useQuery({
    queryKey: tableQueryKeys.list(params),
    queryFn: () => getTables(params),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...queryOptions,
  });
}

/**
 * Options for useTable hook
 */
export interface UseTableOptions {
  /** Table ID to fetch */
  id: string;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetTableResponse, Error, GetTableResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch a single table by ID
 *
 * @example
 * ```tsx
 * const { data: table, isLoading } = useTable({ id: 'table-123' });
 * ```
 */
export function useTable(options: UseTableOptions): UseQueryResult<GetTableResponse, Error> {
  const { id, queryOptions } = options;

  return useQuery({
    queryKey: tableQueryKeys.detail(id),
    queryFn: () => getTable(id),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: Boolean(id),
    ...queryOptions,
  });
}

// ============================================================================
// Zones Hooks
// ============================================================================

/**
 * Options for useZones hook
 */
export interface UseZonesOptions {
  /** Optional query parameters for filtering/pagination */
  params?: GetZonesParams;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetZonesResponse, Error, GetZonesResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch all zones with optional filtering and pagination
 *
 * @example
 * ```tsx
 * // Fetch all zones
 * const { data, isLoading, refetch } = useZones();
 *
 * // Fetch only active zones
 * const { data } = useZones({ params: { isActive: true } });
 *
 * // With search
 * const { data } = useZones({ params: { search: 'Patio' } });
 * ```
 */
export function useZones(options?: UseZonesOptions): UseQueryResult<GetZonesResponse, Error> {
  const { params, queryOptions } = options ?? {};

  return useQuery({
    queryKey: zoneQueryKeys.list(params),
    queryFn: () => getZones(params),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...queryOptions,
  });
}

/**
 * Options for useZone hook
 */
export interface UseZoneOptions {
  /** Zone ID to fetch */
  id: string;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetZoneResponse, Error, GetZoneResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch a single zone by ID
 *
 * @example
 * ```tsx
 * const { data: zone, isLoading } = useZone({ id: 'zone-123' });
 * ```
 */
export function useZone(options: UseZoneOptions): UseQueryResult<GetZoneResponse, Error> {
  const { id, queryOptions } = options;

  return useQuery({
    queryKey: zoneQueryKeys.detail(id),
    queryFn: () => getZone(id),
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
 * Result type for useTablesAndZones hook
 */
export interface TablesAndZonesResult {
  /** Tables query result */
  tables: UseQueryResult<GetTablesResponse, Error>;
  /** Zones query result */
  zones: UseQueryResult<GetZonesResponse, Error>;
  /** Combined loading state (true if either is loading) */
  isLoading: boolean;
  /** Combined error (first error encountered) */
  error: Error | null;
  /** Refetch both tables and zones */
  refetchAll: () => Promise<void>;
}

/**
 * Options for useTablesAndZones hook
 */
export interface UseTablesAndZonesOptions {
  /** Optional table query parameters */
  tableParams?: GetTablesParams;
  /** Optional zone query parameters */
  zoneParams?: GetZonesParams;
}

/**
 * Fetch both tables and zones together
 * Useful for floor plan screens that need both datasets
 *
 * @example
 * ```tsx
 * const { tables, zones, isLoading, refetchAll } = useTablesAndZones();
 *
 * // Pull to refresh
 * <RefreshControl refreshing={isLoading} onRefresh={refetchAll} />
 * ```
 */
export function useTablesAndZones(options?: UseTablesAndZonesOptions): TablesAndZonesResult {
  const { tableParams, zoneParams } = options ?? {};

  const tables = useTables({ params: tableParams });
  const zones = useZones({ params: zoneParams });

  const isLoading = tables.isLoading || zones.isLoading;
  const error = tables.error ?? zones.error;

  const refetchAll = useCallback(async () => {
    await Promise.all([tables.refetch(), zones.refetch()]);
  }, [tables, zones]);

  return {
    tables,
    zones,
    isLoading,
    error,
    refetchAll,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get tables filtered by zone ID from cached data
 * Uses existing cache without making additional requests
 *
 * @example
 * ```tsx
 * const { data } = useTables();
 * const tablesInZone = useTablesByZone(data?.data, 'zone-123');
 * ```
 */
export function useTablesByZone(tables: Table[] | undefined, zoneId: string | undefined): Table[] {
  if (!tables || !zoneId) {
    return tables ?? [];
  }
  return tables.filter((table) => table.zoneId === zoneId);
}

/**
 * Hook for cache invalidation and prefetching
 *
 * @example
 * ```tsx
 * const { invalidateTables, prefetchTables, invalidateAll } = useTableCacheActions();
 *
 * // Invalidate after mutation
 * await updateTable(id, data);
 * invalidateTables();
 *
 * // Prefetch for navigation
 * prefetchTables({ zoneId: 'zone-123' });
 * ```
 */
export function useTableCacheActions() {
  const queryClient = useQueryClient();

  const invalidateTables = useCallback(
    (params?: GetTablesParams) => {
      if (params) {
        queryClient.invalidateQueries({ queryKey: tableQueryKeys.list(params) });
      } else {
        queryClient.invalidateQueries({ queryKey: tableQueryKeys.all });
      }
    },
    [queryClient]
  );

  const invalidateZones = useCallback(
    (params?: GetZonesParams) => {
      if (params) {
        queryClient.invalidateQueries({ queryKey: zoneQueryKeys.list(params) });
      } else {
        queryClient.invalidateQueries({ queryKey: zoneQueryKeys.all });
      }
    },
    [queryClient]
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: tableQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: zoneQueryKeys.all });
  }, [queryClient]);

  const prefetchTables = useCallback(
    async (params?: GetTablesParams) => {
      await queryClient.prefetchQuery({
        queryKey: tableQueryKeys.list(params),
        queryFn: () => getTables(params),
        staleTime: DEFAULT_STALE_TIME,
      });
    },
    [queryClient]
  );

  const prefetchZones = useCallback(
    async (params?: GetZonesParams) => {
      await queryClient.prefetchQuery({
        queryKey: zoneQueryKeys.list(params),
        queryFn: () => getZones(params),
        staleTime: DEFAULT_STALE_TIME,
      });
    },
    [queryClient]
  );

  const prefetchAll = useCallback(async () => {
    await Promise.all([prefetchTables(), prefetchZones()]);
  }, [prefetchTables, prefetchZones]);

  return {
    invalidateTables,
    invalidateZones,
    invalidateAll,
    prefetchTables,
    prefetchZones,
    prefetchAll,
  };
}
