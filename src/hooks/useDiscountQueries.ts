/**
 * React Query hooks for Discounts data fetching
 *
 * Provides optimized data fetching with caching for discount data.
 */

import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { calculateDiscounts, getDiscount, getDiscounts } from '../services/api/discounts';
import type {
  CalculateDiscountsRequest,
  CalculateDiscountsResponse,
  GetDiscountResponse,
  GetDiscountsParams,
  GetDiscountsResponse,
} from '../types/api';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query key factory for discounts
 * Enables targeted cache invalidation and updates
 */
export const discountQueryKeys = {
  all: ['discounts'] as const,
  lists: () => [...discountQueryKeys.all, 'list'] as const,
  list: (params?: GetDiscountsParams) => [...discountQueryKeys.lists(), params] as const,
  details: () => [...discountQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...discountQueryKeys.details(), id] as const,
  calculate: (request: CalculateDiscountsRequest) =>
    [...discountQueryKeys.all, 'calculate', request] as const,
};

// ============================================================================
// Default Query Options
// ============================================================================

/**
 * Default stale time for discounts data (5 minutes)
 * Discounts change less frequently than other data
 */
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

/**
 * Default cache time (30 minutes)
 * Data stays in cache for 30 minutes after last use
 */
const DEFAULT_GC_TIME = 30 * 60 * 1000;

// ============================================================================
// Discounts Hooks
// ============================================================================

/**
 * Options for useDiscounts hook
 */
export interface UseDiscountsOptions {
  /** Optional query parameters for filtering/pagination */
  params?: GetDiscountsParams;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetDiscountsResponse, Error, GetDiscountsResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch all discounts with optional filtering and pagination
 */
export function useDiscounts(
  options?: UseDiscountsOptions
): UseQueryResult<GetDiscountsResponse, Error> {
  const { params, queryOptions } = options ?? {};

  return useQuery({
    queryKey: discountQueryKeys.list(params),
    queryFn: () => getDiscounts(params),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...queryOptions,
  });
}

/**
 * Options for useActiveDiscounts hook
 * Convenience hook for fetching only active discounts
 */
export interface UseActiveDiscountsOptions {
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetDiscountsResponse, Error, GetDiscountsResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch only active discounts
 */
export function useActiveDiscounts(
  options?: UseActiveDiscountsOptions
): UseQueryResult<GetDiscountsResponse, Error> {
  const { queryOptions } = options ?? {};

  return useQuery({
    queryKey: discountQueryKeys.list({ isActive: true }),
    queryFn: () => getDiscounts({ isActive: true }),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...queryOptions,
  });
}

/**
 * Options for useDiscount hook
 */
export interface UseDiscountOptions {
  /** Discount ID to fetch */
  id: string;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetDiscountResponse, Error, GetDiscountResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch a single discount by ID
 */
export function useDiscount(
  options: UseDiscountOptions
): UseQueryResult<GetDiscountResponse, Error> {
  const { id, queryOptions } = options;

  return useQuery({
    queryKey: discountQueryKeys.detail(id),
    queryFn: () => getDiscount(id),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: Boolean(id),
    ...queryOptions,
  });
}

/**
 * Options for useDiscountCalculation hook
 */
export interface UseDiscountCalculationOptions {
  /** Calculation request parameters */
  request: CalculateDiscountsRequest;
  /** Whether to enable the query */
  enabled?: boolean;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<CalculateDiscountsResponse, Error, CalculateDiscountsResponse>,
    'queryKey' | 'queryFn' | 'enabled'
  >;
}

/**
 * Calculate discounts for a bill
 */
export function useDiscountCalculation(
  options: UseDiscountCalculationOptions
): UseQueryResult<CalculateDiscountsResponse, Error> {
  const { request, enabled = true, queryOptions } = options;

  return useQuery({
    queryKey: discountQueryKeys.calculate(request),
    queryFn: () => calculateDiscounts(request),
    staleTime: 0, // Always refetch calculations
    gcTime: DEFAULT_GC_TIME,
    enabled: enabled && request.discountIds.length > 0 && request.billAmount > 0,
    ...queryOptions,
  });
}

// ============================================================================
// Cache Management Hook
// ============================================================================

/**
 * Hook for cache invalidation and prefetching
 */
export function useDiscountCacheActions() {
  const queryClient = useQueryClient();

  const invalidateDiscounts = useCallback(
    (params?: GetDiscountsParams) => {
      if (params) {
        queryClient.invalidateQueries({ queryKey: discountQueryKeys.list(params) });
      } else {
        queryClient.invalidateQueries({ queryKey: discountQueryKeys.all });
      }
    },
    [queryClient]
  );

  const invalidateDiscount = useCallback(
    (id: string) => {
      queryClient.invalidateQueries({ queryKey: discountQueryKeys.detail(id) });
    },
    [queryClient]
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: discountQueryKeys.all });
  }, [queryClient]);

  const prefetchDiscount = useCallback(
    async (id: string) => {
      await queryClient.prefetchQuery({
        queryKey: discountQueryKeys.detail(id),
        queryFn: () => getDiscount(id),
        staleTime: DEFAULT_STALE_TIME,
      });
    },
    [queryClient]
  );

  return {
    invalidateDiscounts,
    invalidateDiscount,
    invalidateAll,
    prefetchDiscount,
  };
}
