/**
 * Custom Hooks Index
 *
 * Central export point for all custom hooks
 */

export {
  type ProtectedRouteState,
  useAuthCallbacks,
  useIsRouteProtected,
  useProtectedRoute,
} from './useProtectedRoute';

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
