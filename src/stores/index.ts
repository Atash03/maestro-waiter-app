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
  useSelectedIds,
  useSelectedTable,
  useSelectedZone,
  useTableError,
  useTableLoading,
  useTableStore,
  useTables,
  useTablesInSelectedZone,
  useZones,
} from './tableStore';
