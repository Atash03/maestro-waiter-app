/**
 * Offline Services Index
 *
 * Exports all offline-related services and utilities.
 */

export {
  // Utility functions
  clearOfflineCache,
  getCacheStatus,
  isExtrasCacheValid,
  isMenuCategoriesCacheValid,
  isMenuItemsCacheValid,
  isTablesCacheValid,
  isZonesCacheValid,
  loadExtrasFromCache,
  loadMenuCategoriesFromCache,
  loadMenuItemsFromCache,
  loadTablesFromCache,
  loadZonesFromCache,
  // Extras cache
  saveExtrasToCache,
  // Menu cache
  saveMenuCategoriesToCache,
  // Menu items cache
  saveMenuItemsToCache,
  // Tables cache
  saveTablesToCache,
  // Zones cache
  saveZonesToCache,
} from './offlineStorage';

export {
  getSyncStatus,
  processOfflineQueue,
  queueOrExecuteMutation,
  retryFailedMutations,
  startSyncMonitoring,
  stopSyncMonitoring,
} from './syncManager';
