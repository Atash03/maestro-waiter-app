/**
 * React Query hooks for Bills data fetching
 *
 * Provides optimized data fetching with caching, background refetching,
 * and pull-to-refresh support for bills data.
 */

import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { calculateBill, getBill, getBills } from '../services/api/bills';
import type {
  CalculateBillRequest,
  CalculateBillResponse,
  GetBillResponse,
  GetBillsParams,
  GetBillsResponse,
} from '../types/api';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query key factory for bills
 * Enables targeted cache invalidation and updates
 */
export const billQueryKeys = {
  all: ['bills'] as const,
  lists: () => [...billQueryKeys.all, 'list'] as const,
  list: (params?: GetBillsParams) => [...billQueryKeys.lists(), params] as const,
  details: () => [...billQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...billQueryKeys.details(), id] as const,
  byOrder: (orderId: string) => [...billQueryKeys.all, 'byOrder', orderId] as const,
  calculate: (request: CalculateBillRequest) =>
    [...billQueryKeys.all, 'calculate', request] as const,
};

// ============================================================================
// Default Query Options
// ============================================================================

/**
 * Default stale time for bills data (1 minute)
 * Bills change frequently during payment flow
 */
const DEFAULT_STALE_TIME = 1 * 60 * 1000;

/**
 * Default cache time (10 minutes)
 * Data stays in cache for 10 minutes after last use
 */
const DEFAULT_GC_TIME = 10 * 60 * 1000;

// ============================================================================
// Bills Hooks
// ============================================================================

/**
 * Options for useBills hook
 */
export interface UseBillsOptions {
  /** Optional query parameters for filtering/pagination */
  params?: GetBillsParams;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetBillsResponse, Error, GetBillsResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch all bills with optional filtering and pagination
 */
export function useBills(options?: UseBillsOptions): UseQueryResult<GetBillsResponse, Error> {
  const { params, queryOptions } = options ?? {};

  return useQuery({
    queryKey: billQueryKeys.list(params),
    queryFn: () => getBills(params),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...queryOptions,
  });
}

/**
 * Options for useBill hook
 */
export interface UseBillOptions {
  /** Bill ID to fetch */
  id: string;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetBillResponse, Error, GetBillResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch a single bill by ID
 */
export function useBill(options: UseBillOptions): UseQueryResult<GetBillResponse, Error> {
  const { id, queryOptions } = options;

  return useQuery({
    queryKey: billQueryKeys.detail(id),
    queryFn: () => getBill(id),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: Boolean(id),
    ...queryOptions,
  });
}

/**
 * Options for useBillByOrder hook
 */
export interface UseBillByOrderOptions {
  /** Order ID to fetch bill for */
  orderId: string;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetBillsResponse, Error, GetBillsResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch bill by order ID
 */
export function useBillByOrder(
  options: UseBillByOrderOptions
): UseQueryResult<GetBillsResponse, Error> {
  const { orderId, queryOptions } = options;

  return useQuery({
    queryKey: billQueryKeys.byOrder(orderId),
    queryFn: () => getBills({ orderId }),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: Boolean(orderId),
    ...queryOptions,
  });
}

/**
 * Options for useBillCalculation hook
 */
export interface UseBillCalculationOptions {
  /** Calculation request parameters */
  request: CalculateBillRequest;
  /** Whether to enable the query */
  enabled?: boolean;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<CalculateBillResponse, Error, CalculateBillResponse>,
    'queryKey' | 'queryFn' | 'enabled'
  >;
}

/**
 * Calculate bill totals (preview)
 */
export function useBillCalculation(
  options: UseBillCalculationOptions
): UseQueryResult<CalculateBillResponse, Error> {
  const { request, enabled = true, queryOptions } = options;

  return useQuery({
    queryKey: billQueryKeys.calculate(request),
    queryFn: () => calculateBill(request),
    staleTime: 0, // Always refetch calculations
    gcTime: DEFAULT_GC_TIME,
    enabled: enabled && Boolean(request.orderId),
    ...queryOptions,
  });
}

// ============================================================================
// Cache Management Hook
// ============================================================================

/**
 * Hook for cache invalidation and prefetching
 */
export function useBillCacheActions() {
  const queryClient = useQueryClient();

  const invalidateBills = useCallback(
    (params?: GetBillsParams) => {
      if (params) {
        queryClient.invalidateQueries({ queryKey: billQueryKeys.list(params) });
      } else {
        queryClient.invalidateQueries({ queryKey: billQueryKeys.all });
      }
    },
    [queryClient]
  );

  const invalidateBill = useCallback(
    (id: string) => {
      queryClient.invalidateQueries({ queryKey: billQueryKeys.detail(id) });
    },
    [queryClient]
  );

  const invalidateBillByOrder = useCallback(
    (orderId: string) => {
      queryClient.invalidateQueries({ queryKey: billQueryKeys.byOrder(orderId) });
    },
    [queryClient]
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: billQueryKeys.all });
  }, [queryClient]);

  const prefetchBill = useCallback(
    async (id: string) => {
      await queryClient.prefetchQuery({
        queryKey: billQueryKeys.detail(id),
        queryFn: () => getBill(id),
        staleTime: DEFAULT_STALE_TIME,
      });
    },
    [queryClient]
  );

  return {
    invalidateBills,
    invalidateBill,
    invalidateBillByOrder,
    invalidateAll,
    prefetchBill,
  };
}
