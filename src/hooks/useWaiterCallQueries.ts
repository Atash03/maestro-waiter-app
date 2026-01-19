/**
 * React Query hooks for Waiter Calls data fetching
 *
 * Provides optimized data fetching with caching, background refetching,
 * and pull-to-refresh support for waiter call data.
 */

import {
  type UseQueryOptions,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  acknowledgeWaiterCall,
  cancelWaiterCall,
  completeWaiterCall,
  getWaiterCall,
  getWaiterCalls,
} from '../services/api/waiterCalls';
import type {
  AcknowledgeWaiterCallResponse,
  CancelWaiterCallResponse,
  CompleteWaiterCallResponse,
  GetWaiterCallResponse,
  GetWaiterCallsParams,
  GetWaiterCallsResponse,
} from '../types/api';
import { WaiterCallStatus } from '../types/enums';
import type { WaiterCall } from '../types/models';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query key factory for waiter calls
 * Enables targeted cache invalidation and updates
 */
export const waiterCallQueryKeys = {
  all: ['waiterCalls'] as const,
  lists: () => [...waiterCallQueryKeys.all, 'list'] as const,
  list: (params?: GetWaiterCallsParams) => [...waiterCallQueryKeys.lists(), params] as const,
  details: () => [...waiterCallQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...waiterCallQueryKeys.details(), id] as const,
};

// ============================================================================
// Default Query Options
// ============================================================================

/**
 * Default stale time for waiter calls data (30 seconds)
 * Waiter calls change very frequently and need to be fresh
 */
const DEFAULT_STALE_TIME = 30 * 1000;

/**
 * Default cache time (5 minutes)
 * Data stays in cache for 5 minutes after last use
 */
const DEFAULT_GC_TIME = 5 * 60 * 1000;

// ============================================================================
// Waiter Calls Hooks
// ============================================================================

/**
 * Options for useWaiterCalls hook
 */
export interface UseWaiterCallsOptions {
  /** Optional query parameters for filtering/pagination */
  params?: GetWaiterCallsParams;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetWaiterCallsResponse, Error, GetWaiterCallsResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch all waiter calls with optional filtering and pagination
 *
 * @example
 * ```tsx
 * // Fetch all calls
 * const { data, isLoading, refetch } = useWaiterCalls();
 *
 * // Fetch pending calls
 * const { data } = useWaiterCalls({ params: { status: WaiterCallStatus.PENDING } });
 *
 * // Fetch calls for a specific table
 * const { data } = useWaiterCalls({ params: { tableId: 'table-123' } });
 * ```
 */
export function useWaiterCalls(
  options?: UseWaiterCallsOptions
): UseQueryResult<GetWaiterCallsResponse, Error> {
  const { params, queryOptions } = options ?? {};

  return useQuery({
    queryKey: waiterCallQueryKeys.list(params),
    queryFn: () => getWaiterCalls(params),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
    ...queryOptions,
  });
}

/**
 * Options for useWaiterCall hook
 */
export interface UseWaiterCallOptions {
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetWaiterCallResponse, Error, GetWaiterCallResponse>,
    'queryKey' | 'queryFn' | 'enabled'
  >;
}

/**
 * Fetch a single waiter call by ID
 *
 * @example
 * ```tsx
 * const { data: call, isLoading } = useWaiterCall('call-123');
 * ```
 */
export function useWaiterCall(
  id: string | undefined,
  options?: UseWaiterCallOptions
): UseQueryResult<GetWaiterCallResponse, Error> {
  const { queryOptions } = options ?? {};

  return useQuery({
    queryKey: waiterCallQueryKeys.detail(id ?? ''),
    queryFn: () => getWaiterCall(id as string),
    enabled: !!id,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...queryOptions,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook for acknowledging a waiter call
 *
 * @example
 * ```tsx
 * const { mutate: acknowledge, isPending } = useAcknowledgeCall();
 * acknowledge('call-123', {
 *   onSuccess: () => console.log('Call acknowledged'),
 * });
 * ```
 */
export function useAcknowledgeCall() {
  const queryClient = useQueryClient();

  return useMutation<AcknowledgeWaiterCallResponse, Error, string>({
    mutationFn: (id: string) => acknowledgeWaiterCall(id),
    onSuccess: (data, id) => {
      // Update the specific call in cache
      queryClient.setQueryData<GetWaiterCallResponse>(waiterCallQueryKeys.detail(id), (old) =>
        old ? { ...old, status: data.status, acknowledgedAt: data.acknowledgedAt } : old
      );
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: waiterCallQueryKeys.lists() });
    },
  });
}

/**
 * Hook for completing a waiter call
 *
 * @example
 * ```tsx
 * const { mutate: complete, isPending } = useCompleteCall();
 * complete('call-123', {
 *   onSuccess: () => console.log('Call completed'),
 * });
 * ```
 */
export function useCompleteCall() {
  const queryClient = useQueryClient();

  return useMutation<CompleteWaiterCallResponse, Error, string>({
    mutationFn: (id: string) => completeWaiterCall(id),
    onSuccess: (data, id) => {
      // Update the specific call in cache
      queryClient.setQueryData<GetWaiterCallResponse>(waiterCallQueryKeys.detail(id), (old) =>
        old ? { ...old, status: data.status, completedAt: data.completedAt } : old
      );
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: waiterCallQueryKeys.lists() });
    },
  });
}

/**
 * Hook for cancelling a waiter call
 *
 * @example
 * ```tsx
 * const { mutate: cancel, isPending } = useCancelCall();
 * cancel('call-123', {
 *   onSuccess: () => console.log('Call cancelled'),
 * });
 * ```
 */
export function useCancelCall() {
  const queryClient = useQueryClient();

  return useMutation<CancelWaiterCallResponse, Error, string>({
    mutationFn: (id: string) => cancelWaiterCall(id),
    onSuccess: (_, id) => {
      // Remove from lists cache
      queryClient.invalidateQueries({ queryKey: waiterCallQueryKeys.lists() });
      // Remove specific call from cache
      queryClient.removeQueries({ queryKey: waiterCallQueryKeys.detail(id) });
    },
  });
}

// ============================================================================
// Cache Actions Hook
// ============================================================================

/**
 * Hook providing cache manipulation actions for waiter calls
 *
 * @example
 * ```tsx
 * const { invalidateCalls, prefetchCall } = useWaiterCallCacheActions();
 *
 * // Invalidate all call data
 * invalidateCalls();
 *
 * // Prefetch a specific call
 * await prefetchCall('call-123');
 * ```
 */
export function useWaiterCallCacheActions() {
  const queryClient = useQueryClient();

  const invalidateCalls = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: waiterCallQueryKeys.all });
  }, [queryClient]);

  const invalidateCallsList = useCallback(
    (params?: GetWaiterCallsParams) => {
      queryClient.invalidateQueries({ queryKey: waiterCallQueryKeys.list(params) });
    },
    [queryClient]
  );

  const prefetchCall = useCallback(
    async (id: string) => {
      await queryClient.prefetchQuery({
        queryKey: waiterCallQueryKeys.detail(id),
        queryFn: () => getWaiterCall(id),
        staleTime: DEFAULT_STALE_TIME,
      });
    },
    [queryClient]
  );

  const setCallData = useCallback(
    (id: string, data: WaiterCall) => {
      queryClient.setQueryData(waiterCallQueryKeys.detail(id), data);
    },
    [queryClient]
  );

  return {
    invalidateCalls,
    invalidateCallsList,
    prefetchCall,
    setCallData,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Filter calls by status
 */
export function filterCallsByStatus(
  calls: WaiterCall[] | undefined,
  status: WaiterCallStatus
): WaiterCall[] {
  if (!calls) return [];
  return calls.filter((call) => call.status === status);
}

/**
 * Get active calls (pending + acknowledged)
 */
export function getActiveCalls(calls: WaiterCall[] | undefined): WaiterCall[] {
  if (!calls) return [];
  return calls.filter(
    (call) =>
      call.status === WaiterCallStatus.PENDING || call.status === WaiterCallStatus.ACKNOWLEDGED
  );
}

/**
 * Sort calls by created date
 * @param ascending - If true, oldest first. If false, newest first (default)
 */
export function sortCallsByDate(calls: WaiterCall[] | undefined, ascending = false): WaiterCall[] {
  if (!calls) return [];
  return [...calls].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

/**
 * Format time elapsed since call was created
 */
export function formatCallElapsedTime(createdAt: string): string {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return `${diffSec}s`;
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m`;
  }

  const diffHour = Math.floor(diffMin / 60);
  const remainingMin = diffMin % 60;
  return `${diffHour}h ${remainingMin}m`;
}

/**
 * Get urgency level based on wait time
 * @returns 'low' | 'medium' | 'high' | 'critical'
 */
export function getCallUrgency(createdAt: string): 'low' | 'medium' | 'high' | 'critical' {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 2) return 'low';
  if (diffMin < 5) return 'medium';
  if (diffMin < 10) return 'high';
  return 'critical';
}
