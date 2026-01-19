/**
 * Table Store for the Maestro Waiter App
 *
 * Features:
 * - Cache tables and zones data
 * - Track selected table
 * - Filter tables by zone
 * - "My Section" view for waiter's assigned tables
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { getTables } from '../services/api/tables';
import { getZones } from '../services/api/zones';
import type { Table, Zone } from '../types/models';

/**
 * View mode for the floor plan
 */
export type TableViewMode = 'all' | 'mySection';

/**
 * Table store state interface
 */
export interface TableState {
  // State
  tables: Table[];
  zones: Zone[];
  selectedTableId: string | null;
  selectedZoneId: string | null;
  isLoadingTables: boolean;
  isLoadingZones: boolean;
  error: string | null;
  viewMode: TableViewMode;
  assignedTableIds: Set<string>;

  // Actions
  fetchTables: () => Promise<void>;
  fetchZones: () => Promise<void>;
  fetchAll: () => Promise<void>;
  selectTable: (tableId: string | null) => void;
  selectZone: (zoneId: string | null) => void;
  getTableById: (tableId: string) => Table | undefined;
  getZoneById: (zoneId: string) => Zone | undefined;
  getTablesByZone: (zoneId: string) => Table[];
  clearError: () => void;
  reset: () => void;
  setViewMode: (mode: TableViewMode) => void;
  toggleViewMode: () => void;
  setAssignedTableIds: (tableIds: string[]) => void;
  addAssignedTableId: (tableId: string) => void;
  removeAssignedTableId: (tableId: string) => void;
  isTableAssigned: (tableId: string) => boolean;
  getAssignedTables: () => Table[];
}

/**
 * Initial state values
 */
const initialState = {
  tables: [] as Table[],
  zones: [] as Zone[],
  selectedTableId: null as string | null,
  selectedZoneId: null as string | null,
  isLoadingTables: false,
  isLoadingZones: false,
  error: null as string | null,
  viewMode: 'all' as TableViewMode,
  assignedTableIds: new Set<string>(),
};

/**
 * Table store using Zustand
 */
export const useTableStore = create<TableState>((set, get) => ({
  // Initial state
  ...initialState,

  /**
   * Fetch all tables from the API
   */
  fetchTables: async () => {
    set({ isLoadingTables: true, error: null });

    try {
      const response = await getTables();
      set({
        tables: response.data,
        isLoadingTables: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch tables';
      set({
        error: message,
        isLoadingTables: false,
      });
      throw error;
    }
  },

  /**
   * Fetch all zones from the API
   */
  fetchZones: async () => {
    set({ isLoadingZones: true, error: null });

    try {
      const response = await getZones();
      set({
        zones: response.data,
        isLoadingZones: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch zones';
      set({
        error: message,
        isLoadingZones: false,
      });
      throw error;
    }
  },

  /**
   * Fetch both tables and zones
   */
  fetchAll: async () => {
    const { fetchTables, fetchZones } = get();

    // Fetch both in parallel
    await Promise.all([fetchTables(), fetchZones()]);
  },

  /**
   * Select a table by ID
   */
  selectTable: (tableId: string | null) => {
    set({ selectedTableId: tableId });
  },

  /**
   * Select a zone by ID
   * Also clears selected table if it's not in the new zone
   */
  selectZone: (zoneId: string | null) => {
    const { selectedTableId, tables } = get();

    // If a table is selected, check if it belongs to the new zone
    if (selectedTableId && zoneId) {
      const selectedTable = tables.find((t) => t.id === selectedTableId);
      if (selectedTable && selectedTable.zoneId !== zoneId) {
        // Clear selected table if it doesn't belong to the new zone
        set({ selectedZoneId: zoneId, selectedTableId: null });
        return;
      }
    }

    set({ selectedZoneId: zoneId });
  },

  /**
   * Get a table by ID
   */
  getTableById: (tableId: string) => {
    return get().tables.find((t) => t.id === tableId);
  },

  /**
   * Get a zone by ID
   */
  getZoneById: (zoneId: string) => {
    return get().zones.find((z) => z.id === zoneId);
  },

  /**
   * Get all tables in a specific zone
   */
  getTablesByZone: (zoneId: string) => {
    return get().tables.filter((t) => t.zoneId === zoneId);
  },

  /**
   * Clear any error message
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({ ...initialState, assignedTableIds: new Set<string>() });
  },

  /**
   * Set the view mode (all tables or my section)
   */
  setViewMode: (mode: TableViewMode) => {
    set({ viewMode: mode });
  },

  /**
   * Toggle between 'all' and 'mySection' view modes
   */
  toggleViewMode: () => {
    const { viewMode } = get();
    set({ viewMode: viewMode === 'all' ? 'mySection' : 'all' });
  },

  /**
   * Set the list of assigned table IDs for "My Section" view
   * This should be called when orders are loaded/updated
   */
  setAssignedTableIds: (tableIds: string[]) => {
    set({ assignedTableIds: new Set(tableIds) });
  },

  /**
   * Add a table ID to the assigned tables
   */
  addAssignedTableId: (tableId: string) => {
    const { assignedTableIds } = get();
    const newSet = new Set(assignedTableIds);
    newSet.add(tableId);
    set({ assignedTableIds: newSet });
  },

  /**
   * Remove a table ID from the assigned tables
   */
  removeAssignedTableId: (tableId: string) => {
    const { assignedTableIds } = get();
    const newSet = new Set(assignedTableIds);
    newSet.delete(tableId);
    set({ assignedTableIds: newSet });
  },

  /**
   * Check if a table is assigned to the current waiter
   */
  isTableAssigned: (tableId: string) => {
    return get().assignedTableIds.has(tableId);
  },

  /**
   * Get all tables assigned to the current waiter
   */
  getAssignedTables: () => {
    const { tables, assignedTableIds } = get();
    return tables.filter((t) => assignedTableIds.has(t.id));
  },
}));

/**
 * Hook to get all tables
 */
export const useTables = () => useTableStore((state) => state.tables);

/**
 * Hook to get all zones
 */
export const useZones = () => useTableStore((state) => state.zones);

/**
 * Hook to get the selected table
 */
export const useSelectedTable = () =>
  useTableStore((state) => {
    if (!state.selectedTableId) return null;
    return state.tables.find((t) => t.id === state.selectedTableId) ?? null;
  });

/**
 * Hook to get the selected zone
 */
export const useSelectedZone = () =>
  useTableStore((state) => {
    if (!state.selectedZoneId) return null;
    return state.zones.find((z) => z.id === state.selectedZoneId) ?? null;
  });

/**
 * Hook to get tables filtered by the currently selected zone
 */
export const useTablesInSelectedZone = () =>
  useTableStore((state) => {
    if (!state.selectedZoneId) return state.tables;
    return state.tables.filter((t) => t.zoneId === state.selectedZoneId);
  });

/**
 * Hook to get loading states
 */
export const useTableLoading = () =>
  useTableStore(
    useShallow((state) => ({
      isLoadingTables: state.isLoadingTables,
      isLoadingZones: state.isLoadingZones,
      isLoading: state.isLoadingTables || state.isLoadingZones,
    }))
  );

/**
 * Hook to get table store error
 */
export const useTableError = () => useTableStore((state) => state.error);

/**
 * Hook to get selected IDs
 */
export const useSelectedIds = () =>
  useTableStore(
    useShallow((state) => ({
      selectedTableId: state.selectedTableId,
      selectedZoneId: state.selectedZoneId,
    }))
  );

/**
 * Hook to get current view mode
 */
export const useViewMode = () => useTableStore((state) => state.viewMode);

/**
 * Hook to get assigned table IDs
 */
export const useAssignedTableIds = () => useTableStore((state) => state.assignedTableIds);

/**
 * Hook to get assigned tables (full Table objects)
 * Note: This selector returns a filtered array. For stable references, use useTableStore directly.
 */
export const useAssignedTables = () => {
  const tables = useTableStore((state) => state.tables);
  const assignedTableIds = useTableStore((state) => state.assignedTableIds);
  return tables.filter((t) => assignedTableIds.has(t.id));
};

/**
 * Hook to check if a specific table is assigned
 */
export const useIsTableAssigned = (tableId: string) =>
  useTableStore((state) => state.assignedTableIds.has(tableId));

/**
 * Hook to get view mode state and toggle action
 */
export const useViewModeToggle = () => {
  const viewMode = useTableStore((state) => state.viewMode);
  const toggleViewMode = useTableStore((state) => state.toggleViewMode);
  const setViewMode = useTableStore((state) => state.setViewMode);
  return { viewMode, toggleViewMode, setViewMode };
};

/**
 * Hook to get tables filtered by view mode (all tables or my section)
 * When viewMode is 'mySection', returns only assigned tables
 * When viewMode is 'all', returns all tables
 */
export const useTablesByViewMode = () => {
  const tables = useTableStore((state) => state.tables);
  const viewMode = useTableStore((state) => state.viewMode);
  const assignedTableIds = useTableStore((state) => state.assignedTableIds);

  if (viewMode === 'mySection') {
    return tables.filter((t) => assignedTableIds.has(t.id));
  }
  return tables;
};
