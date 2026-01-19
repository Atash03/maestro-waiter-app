/**
 * Custom Hooks Index
 *
 * Central export point for all custom hooks
 */

export {
  // Query keys
  extraQueryKeys,
  // Combined hooks
  type MenuDataResult,
  menuCategoryQueryKeys,
  menuItemQueryKeys,
  type UseExtraOptions,
  type UseExtrasOptions,
  type UseMenuCategoriesOptions,
  type UseMenuCategoryOptions,
  type UseMenuDataOptions,
  type UseMenuItemOptions,
  type UseMenuItemsOptions,
  useActiveMenuItems,
  useExtra,
  useExtras,
  useExtrasForItem,
  useMenuCacheActions,
  useMenuCategories,
  useMenuCategory,
  useMenuData,
  useMenuItem,
  useMenuItemSearch,
  useMenuItems,
  useMenuItemsByCategory,
} from './useMenuQueries';
export {
  // Utility functions
  countOrdersWithReadyItems,
  filterOrdersByStatus,
  filterOrdersByTable,
  filterOrdersByType,
  getActiveOrders,
  // Query keys
  orderQueryKeys,
  sortOrdersByDate,
  type UseOrderOptions,
  type UseOrdersOptions,
  useOrder,
  useOrderCacheActions,
  // Hooks
  useOrders,
} from './useOrderQueries';
export {
  type ProtectedRouteState,
  useAuthCallbacks,
  useIsRouteProtected,
  useProtectedRoute,
} from './useProtectedRoute';
export {
  // Query keys
  reasonTemplateQueryKeys,
  // Hooks
  type UseReasonTemplatesOptions,
  useCancellationReasons,
  useReasonTemplateCacheActions,
  useReasonTemplates,
} from './useReasonTemplateQueries';
export {
  // Helper functions
  convertExtrasToApiFormat,
  getErrorMessage,
  prepareBatchItemsRequest,
  // Types
  type SendToKitchenResult,
  type UseSendToKitchenReturn,
  type UseSendToKitchenState,
  // Hook
  useSendToKitchen,
} from './useSendToKitchen';
export {
  // Combined hooks
  type TablesAndZonesResult,
  // Query keys
  tableQueryKeys,
  type UseTableOptions,
  type UseTablesAndZonesOptions,
  // Tables hooks
  type UseTablesOptions,
  type UseZoneOptions,
  // Zones hooks
  type UseZonesOptions,
  useTable,
  useTableCacheActions,
  useTables,
  useTablesAndZones,
  // Utility hooks
  useTablesByZone,
  useZone,
  useZones,
  zoneQueryKeys,
} from './useTableQueries';
export {
  // Utility functions
  filterCallsByStatus,
  formatCallElapsedTime,
  getActiveCalls,
  getCallUrgency,
  sortCallsByDate,
  // Hooks
  type UseWaiterCallOptions,
  type UseWaiterCallsOptions,
  // Mutation hooks
  useAcknowledgeCall,
  useCancelCall,
  useCompleteCall,
  useWaiterCall,
  useWaiterCallCacheActions,
  useWaiterCalls,
  // Query keys
  waiterCallQueryKeys,
} from './useWaiterCallQueries';
