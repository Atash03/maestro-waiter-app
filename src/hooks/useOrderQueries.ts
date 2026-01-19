/**
 * React Query hooks for Orders data fetching
 *
 * Provides optimized data fetching with caching, background refetching,
 * and pull-to-refresh support for orders data.
 */

import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { getOrder, getOrders } from '../services/api/orders';
import type { GetOrderResponse, GetOrdersParams, GetOrdersResponse } from '../types/api';
import type { Order } from '../types/models';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query key factory for orders
 * Enables targeted cache invalidation and updates
 */
export const orderQueryKeys = {
  all: ['orders'] as const,
  lists: () => [...orderQueryKeys.all, 'list'] as const,
  list: (params?: GetOrdersParams) => [...orderQueryKeys.lists(), params] as const,
  details: () => [...orderQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderQueryKeys.details(), id] as const,
};

// ============================================================================
// Default Query Options
// ============================================================================

/**
 * Default stale time for orders data (2 minutes)
 * Orders change more frequently than tables/menu
 */
const DEFAULT_STALE_TIME = 2 * 60 * 1000;

/**
 * Default cache time (15 minutes)
 * Data stays in cache for 15 minutes after last use
 */
const DEFAULT_GC_TIME = 15 * 60 * 1000;

// ============================================================================
// Orders Hooks
// ============================================================================

/**
 * Options for useOrders hook
 */
export interface UseOrdersOptions {
  /** Optional query parameters for filtering/pagination */
  params?: GetOrdersParams;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetOrdersResponse, Error, GetOrdersResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch all orders with optional filtering and pagination
 *
 * @example
 * ```tsx
 * // Fetch all orders
 * const { data, isLoading, refetch } = useOrders();
 *
 * // Fetch pending orders
 * const { data } = useOrders({ params: { status: OrderStatus.PENDING } });
 *
 * // Fetch orders for a specific table
 * const { data } = useOrders({ params: { tableId: 'table-123' } });
 * ```
 */
export function useOrders(options?: UseOrdersOptions): UseQueryResult<GetOrdersResponse, Error> {
  const { params, queryOptions } = options ?? {};

  return useQuery({
    queryKey: orderQueryKeys.list(params),
    queryFn: () => getOrders(params),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    ...queryOptions,
  });
}

/**
 * Options for useOrder hook
 */
export interface UseOrderOptions {
  /** Order ID to fetch */
  id: string;
  /** Additional React Query options */
  queryOptions?: Omit<
    UseQueryOptions<GetOrderResponse, Error, GetOrderResponse>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Fetch a single order by ID
 *
 * @example
 * ```tsx
 * const { data: order, isLoading } = useOrder({ id: 'order-123' });
 * ```
 */
export function useOrder(options: UseOrderOptions): UseQueryResult<GetOrderResponse, Error> {
  const { id, queryOptions } = options;

  return useQuery({
    queryKey: orderQueryKeys.detail(id),
    queryFn: () => getOrder(id),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: Boolean(id),
    ...queryOptions,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Filter orders by status from cached data
 */
export function filterOrdersByStatus(
  orders: Order[] | undefined,
  status: string | undefined
): Order[] {
  if (!orders) return [];
  if (!status) return orders;
  return orders.filter((order) => order.orderStatus === status);
}

/**
 * Filter orders by type from cached data
 */
export function filterOrdersByType(
  orders: Order[] | undefined,
  orderType: string | undefined
): Order[] {
  if (!orders) return [];
  if (!orderType) return orders;
  return orders.filter((order) => order.orderType === orderType);
}

/**
 * Filter orders by table from cached data
 */
export function filterOrdersByTable(
  orders: Order[] | undefined,
  tableId: string | undefined
): Order[] {
  if (!orders) return [];
  if (!tableId) return orders;
  return orders.filter((order) => order.tableId === tableId);
}

/**
 * Get active orders (Pending or InProgress)
 */
export function getActiveOrders(orders: Order[] | undefined): Order[] {
  if (!orders) return [];
  return orders.filter(
    (order) => order.orderStatus === 'Pending' || order.orderStatus === 'InProgress'
  );
}

/**
 * Count orders with ready items
 */
export function countOrdersWithReadyItems(orders: Order[] | undefined): number {
  if (!orders) return 0;
  return orders.filter((order) => order.orderItems?.some((item) => item.status === 'Ready')).length;
}

/**
 * Sort orders by creation date (newest first by default)
 */
export function sortOrdersByDate(orders: Order[] | undefined, ascending = false): Order[] {
  if (!orders) return [];
  return [...orders].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

// ============================================================================
// Cache Management Hook
// ============================================================================

/**
 * Hook for cache invalidation and prefetching
 *
 * @example
 * ```tsx
 * const { invalidateOrders, prefetchOrders, invalidateOrder } = useOrderCacheActions();
 *
 * // Invalidate after mutation
 * await updateOrder(id, data);
 * invalidateOrders();
 *
 * // Prefetch for navigation
 * prefetchOrders({ status: OrderStatus.PENDING });
 * ```
 */
export function useOrderCacheActions() {
  const queryClient = useQueryClient();

  const invalidateOrders = useCallback(
    (params?: GetOrdersParams) => {
      if (params) {
        queryClient.invalidateQueries({ queryKey: orderQueryKeys.list(params) });
      } else {
        queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
      }
    },
    [queryClient]
  );

  const invalidateOrder = useCallback(
    (id: string) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(id) });
    },
    [queryClient]
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
  }, [queryClient]);

  const prefetchOrders = useCallback(
    async (params?: GetOrdersParams) => {
      await queryClient.prefetchQuery({
        queryKey: orderQueryKeys.list(params),
        queryFn: () => getOrders(params),
        staleTime: DEFAULT_STALE_TIME,
      });
    },
    [queryClient]
  );

  const prefetchOrder = useCallback(
    async (id: string) => {
      await queryClient.prefetchQuery({
        queryKey: orderQueryKeys.detail(id),
        queryFn: () => getOrder(id),
        staleTime: DEFAULT_STALE_TIME,
      });
    },
    [queryClient]
  );

  return {
    invalidateOrders,
    invalidateOrder,
    invalidateAll,
    prefetchOrders,
    prefetchOrder,
  };
}
