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
