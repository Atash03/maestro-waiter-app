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
  type ProtectedRouteState,
  useAuthCallbacks,
  useIsRouteProtected,
  useProtectedRoute,
} from './useProtectedRoute';
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
