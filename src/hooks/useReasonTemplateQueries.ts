/**
 * React Query hooks for Reason Templates data fetching
 *
 * Provides optimized data fetching with caching for reason templates
 * used in order cancellation, item cancellation, and discounts.
 */

import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { getReasonTemplates } from '../services/api/reasonTemplates';
import type { GetReasonTemplatesParams, GetReasonTemplatesResponse } from '../types/api';
import { ReasonTemplateType } from '../types/enums';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query key factory for reason templates
 */
export const reasonTemplateQueryKeys = {
  all: ['reasonTemplates'] as const,
  lists: () => [...reasonTemplateQueryKeys.all, 'list'] as const,
  list: (params?: GetReasonTemplatesParams) =>
    [...reasonTemplateQueryKeys.lists(), params] as const,
};

// ============================================================================
// Default Query Options
// ============================================================================

/**
 * Default stale time for reason templates (30 minutes)
 * Reason templates rarely change
 */
const DEFAULT_STALE_TIME = 30 * 60 * 1000;

/**
 * Default cache time (1 hour)
 */
const DEFAULT_GC_TIME = 60 * 60 * 1000;

// ============================================================================
// Hooks
// ============================================================================

/**
 * Options for useReasonTemplates hook
 */
export interface UseReasonTemplatesOptions {
  /** Optional query parameters for filtering */
  params?: GetReasonTemplatesParams;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetReasonTemplatesResponse, Error, GetReasonTemplatesResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch reason templates with optional filtering
 *
 * @example
 * ```tsx
 * // Fetch all cancellation reasons
 * const { data } = useReasonTemplates({
 *   params: { type: ReasonTemplateType.CANCELLATION }
 * });
 *
 * // Fetch all reason templates
 * const { data } = useReasonTemplates();
 * ```
 */
export function useReasonTemplates(
  options?: UseReasonTemplatesOptions
): UseQueryResult<GetReasonTemplatesResponse, Error> {
  const { params, queryOptions } = options ?? {};

  return useQuery({
    queryKey: reasonTemplateQueryKeys.list(params),
    queryFn: () => getReasonTemplates(params),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...queryOptions,
  });
}

/**
 * Convenience hook to fetch cancellation reasons
 */
export function useCancellationReasons(
  queryOptions?: Omit<
    UseQueryOptions<GetReasonTemplatesResponse, Error, GetReasonTemplatesResponse>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<GetReasonTemplatesResponse, Error> {
  return useReasonTemplates({
    params: { type: ReasonTemplateType.CANCELLATION },
    queryOptions,
  });
}

// ============================================================================
// Cache Management Hook
// ============================================================================

/**
 * Hook for cache invalidation and prefetching
 */
export function useReasonTemplateCacheActions() {
  const queryClient = useQueryClient();

  const invalidateReasonTemplates = useCallback(
    (params?: GetReasonTemplatesParams) => {
      if (params) {
        queryClient.invalidateQueries({ queryKey: reasonTemplateQueryKeys.list(params) });
      } else {
        queryClient.invalidateQueries({ queryKey: reasonTemplateQueryKeys.all });
      }
    },
    [queryClient]
  );

  const prefetchReasonTemplates = useCallback(
    async (params?: GetReasonTemplatesParams) => {
      await queryClient.prefetchQuery({
        queryKey: reasonTemplateQueryKeys.list(params),
        queryFn: () => getReasonTemplates(params),
        staleTime: DEFAULT_STALE_TIME,
      });
    },
    [queryClient]
  );

  return {
    invalidateReasonTemplates,
    prefetchReasonTemplates,
  };
}
