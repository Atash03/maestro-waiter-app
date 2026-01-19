/**
 * Stores index - exports all Zustand stores
 */

export {
  type AuthState,
  useAccount,
  useAuthError,
  useAuthLoading,
  useAuthStore,
  useIsAuthenticated,
  useRememberMe,
} from './authStore';
export {
  getTranslatedText,
  type MenuState,
  useExtras,
  useFilteredItems,
  useItemsByCategory,
  useMenuCategories,
  useMenuError,
  useMenuItems,
  useMenuLoading,
  useMenuStore,
  useRecentItemIds,
  useRecentItems,
  useSearchQuery,
  useSelectedCategory,
  useSelectedCategoryId,
} from './menuStore';
export {
  type TableState,
  type TableViewMode,
  useAssignedTableIds,
  useAssignedTables,
  useIsTableAssigned,
  useSelectedIds,
  useSelectedTable,
  useSelectedZone,
  useTableError,
  useTableLoading,
  useTableStore,
  useTables,
  useTablesByViewMode,
  useTablesInSelectedZone,
  useViewMode,
  useViewModeToggle,
  useZones,
} from './tableStore';
