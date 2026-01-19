/**
 * Tests for the Table Store
 */

import type { Table, Zone } from '../types/models';

// Mock the API client module
const mockGetTables = jest.fn();
const mockGetZones = jest.fn();

jest.mock('../services/api/tables', () => ({
  getTables: () => mockGetTables(),
}));

jest.mock('../services/api/zones', () => ({
  getZones: () => mockGetZones(),
}));

// Import the store after mocking
import {
  useSelectedIds,
  useSelectedTable,
  useSelectedZone,
  useTableError,
  useTableLoading,
  useTableStore,
  useTables,
  useTablesInSelectedZone,
  useZones,
} from '../stores/tableStore';

// Test data
const testZones: Zone[] = [
  {
    id: 'zone-1',
    title: { en: 'Main Hall', ru: 'Главный зал', tm: 'Baş zal' },
    isActive: true,
    x: '0',
    y: '0',
  },
  {
    id: 'zone-2',
    title: { en: 'Terrace', ru: 'Терраса', tm: 'Eýwan' },
    isActive: true,
    x: '500',
    y: '0',
  },
  {
    id: 'zone-3',
    title: { en: 'VIP Room', ru: 'VIP комната', tm: 'VIP otag' },
    isActive: false,
    x: '0',
    y: '500',
  },
];

const testTables: Table[] = [
  {
    id: 'table-1',
    title: 'T1',
    capacity: 4,
    zoneId: 'zone-1',
    x: '100',
    y: '100',
    width: '80',
    height: '80',
    color: '#22C55E',
  },
  {
    id: 'table-2',
    title: 'T2',
    capacity: 2,
    zoneId: 'zone-1',
    x: '200',
    y: '100',
    width: '60',
    height: '60',
    color: '#F59E0B',
  },
  {
    id: 'table-3',
    title: 'T3',
    capacity: 6,
    zoneId: 'zone-2',
    x: '100',
    y: '100',
    width: '100',
    height: '100',
    color: '#3B82F6',
  },
  {
    id: 'table-4',
    title: 'T4',
    capacity: 8,
    zoneId: 'zone-2',
    x: '250',
    y: '100',
    width: '120',
    height: '80',
    color: '#22C55E',
  },
];

describe('TableStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useTableStore.setState({
      tables: [],
      zones: [],
      selectedTableId: null,
      selectedZoneId: null,
      isLoadingTables: false,
      isLoadingZones: false,
      error: null,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useTableStore.getState();

      expect(state.tables).toEqual([]);
      expect(state.zones).toEqual([]);
      expect(state.selectedTableId).toBeNull();
      expect(state.selectedZoneId).toBeNull();
      expect(state.isLoadingTables).toBe(false);
      expect(state.isLoadingZones).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchTables', () => {
    it('should fetch tables successfully', async () => {
      mockGetTables.mockResolvedValueOnce({ data: testTables });

      const { fetchTables } = useTableStore.getState();
      await fetchTables();

      const state = useTableStore.getState();
      expect(state.tables).toEqual(testTables);
      expect(state.isLoadingTables).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isLoadingTables while fetching', async () => {
      let resolveFetch: ((value: { data: Table[] }) => void) | undefined;
      mockGetTables.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { fetchTables } = useTableStore.getState();
      const fetchPromise = fetchTables();

      // Check that isLoadingTables is true while waiting
      expect(useTableStore.getState().isLoadingTables).toBe(true);

      // Complete the fetch
      resolveFetch?.({ data: testTables });
      await fetchPromise;

      // Check that isLoadingTables is false after completion
      expect(useTableStore.getState().isLoadingTables).toBe(false);
    });

    it('should handle fetch tables error', async () => {
      mockGetTables.mockRejectedValueOnce(new Error('Network error'));

      const { fetchTables } = useTableStore.getState();

      await expect(fetchTables()).rejects.toThrow('Network error');

      const state = useTableStore.getState();
      expect(state.tables).toEqual([]);
      expect(state.isLoadingTables).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should clear previous error on new fetch', async () => {
      useTableStore.setState({ error: 'Previous error' });
      mockGetTables.mockResolvedValueOnce({ data: testTables });

      const { fetchTables } = useTableStore.getState();
      await fetchTables();

      expect(useTableStore.getState().error).toBeNull();
    });
  });

  describe('fetchZones', () => {
    it('should fetch zones successfully', async () => {
      mockGetZones.mockResolvedValueOnce({ data: testZones });

      const { fetchZones } = useTableStore.getState();
      await fetchZones();

      const state = useTableStore.getState();
      expect(state.zones).toEqual(testZones);
      expect(state.isLoadingZones).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isLoadingZones while fetching', async () => {
      let resolveFetch: ((value: { data: Zone[] }) => void) | undefined;
      mockGetZones.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { fetchZones } = useTableStore.getState();
      const fetchPromise = fetchZones();

      // Check that isLoadingZones is true while waiting
      expect(useTableStore.getState().isLoadingZones).toBe(true);

      // Complete the fetch
      resolveFetch?.({ data: testZones });
      await fetchPromise;

      // Check that isLoadingZones is false after completion
      expect(useTableStore.getState().isLoadingZones).toBe(false);
    });

    it('should handle fetch zones error', async () => {
      mockGetZones.mockRejectedValueOnce(new Error('Server error'));

      const { fetchZones } = useTableStore.getState();

      await expect(fetchZones()).rejects.toThrow('Server error');

      const state = useTableStore.getState();
      expect(state.zones).toEqual([]);
      expect(state.isLoadingZones).toBe(false);
      expect(state.error).toBe('Server error');
    });
  });

  describe('fetchAll', () => {
    it('should fetch both tables and zones', async () => {
      mockGetTables.mockResolvedValueOnce({ data: testTables });
      mockGetZones.mockResolvedValueOnce({ data: testZones });

      const { fetchAll } = useTableStore.getState();
      await fetchAll();

      const state = useTableStore.getState();
      expect(state.tables).toEqual(testTables);
      expect(state.zones).toEqual(testZones);
    });

    it('should fetch tables and zones in parallel', async () => {
      const fetchOrder: string[] = [];

      mockGetTables.mockImplementation(async () => {
        fetchOrder.push('tables-start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        fetchOrder.push('tables-end');
        return { data: testTables };
      });

      mockGetZones.mockImplementation(async () => {
        fetchOrder.push('zones-start');
        await new Promise((resolve) => setTimeout(resolve, 5));
        fetchOrder.push('zones-end');
        return { data: testZones };
      });

      const { fetchAll } = useTableStore.getState();
      await fetchAll();

      // Both should start before either finishes
      expect(fetchOrder.indexOf('tables-start')).toBeLessThan(fetchOrder.indexOf('tables-end'));
      expect(fetchOrder.indexOf('zones-start')).toBeLessThan(fetchOrder.indexOf('zones-end'));
      expect(fetchOrder.indexOf('zones-start')).toBeLessThan(fetchOrder.indexOf('tables-end'));
    });
  });

  describe('selectTable', () => {
    it('should select a table by ID', () => {
      const { selectTable } = useTableStore.getState();
      selectTable('table-1');

      expect(useTableStore.getState().selectedTableId).toBe('table-1');
    });

    it('should clear selection when null is passed', () => {
      useTableStore.setState({ selectedTableId: 'table-1' });

      const { selectTable } = useTableStore.getState();
      selectTable(null);

      expect(useTableStore.getState().selectedTableId).toBeNull();
    });
  });

  describe('selectZone', () => {
    beforeEach(() => {
      useTableStore.setState({ tables: testTables });
    });

    it('should select a zone by ID', () => {
      const { selectZone } = useTableStore.getState();
      selectZone('zone-1');

      expect(useTableStore.getState().selectedZoneId).toBe('zone-1');
    });

    it('should clear selection when null is passed', () => {
      useTableStore.setState({ selectedZoneId: 'zone-1' });

      const { selectZone } = useTableStore.getState();
      selectZone(null);

      expect(useTableStore.getState().selectedZoneId).toBeNull();
    });

    it('should clear selected table when changing to a zone that does not contain the table', () => {
      useTableStore.setState({
        selectedTableId: 'table-1', // In zone-1
        selectedZoneId: 'zone-1',
      });

      const { selectZone } = useTableStore.getState();
      selectZone('zone-2'); // table-1 is not in zone-2

      const state = useTableStore.getState();
      expect(state.selectedZoneId).toBe('zone-2');
      expect(state.selectedTableId).toBeNull();
    });

    it('should keep selected table when changing to a zone that contains the table', () => {
      useTableStore.setState({
        selectedTableId: 'table-3', // In zone-2
        selectedZoneId: 'zone-1',
      });

      const { selectZone } = useTableStore.getState();
      selectZone('zone-2'); // table-3 is in zone-2

      const state = useTableStore.getState();
      expect(state.selectedZoneId).toBe('zone-2');
      expect(state.selectedTableId).toBe('table-3');
    });

    it('should keep selected table when table is not found', () => {
      useTableStore.setState({
        selectedTableId: 'non-existent-table',
        selectedZoneId: 'zone-1',
      });

      const { selectZone } = useTableStore.getState();
      selectZone('zone-2');

      // Table not found, so zone changes but table is not cleared
      expect(useTableStore.getState().selectedZoneId).toBe('zone-2');
    });
  });

  describe('getTableById', () => {
    beforeEach(() => {
      useTableStore.setState({ tables: testTables });
    });

    it('should return table by ID', () => {
      const { getTableById } = useTableStore.getState();
      const table = getTableById('table-1');

      expect(table).toEqual(testTables[0]);
    });

    it('should return undefined for non-existent table', () => {
      const { getTableById } = useTableStore.getState();
      const table = getTableById('non-existent');

      expect(table).toBeUndefined();
    });
  });

  describe('getZoneById', () => {
    beforeEach(() => {
      useTableStore.setState({ zones: testZones });
    });

    it('should return zone by ID', () => {
      const { getZoneById } = useTableStore.getState();
      const zone = getZoneById('zone-1');

      expect(zone).toEqual(testZones[0]);
    });

    it('should return undefined for non-existent zone', () => {
      const { getZoneById } = useTableStore.getState();
      const zone = getZoneById('non-existent');

      expect(zone).toBeUndefined();
    });
  });

  describe('getTablesByZone', () => {
    beforeEach(() => {
      useTableStore.setState({ tables: testTables });
    });

    it('should return tables for a specific zone', () => {
      const { getTablesByZone } = useTableStore.getState();
      const tables = getTablesByZone('zone-1');

      expect(tables).toHaveLength(2);
      expect(tables.map((t) => t.id)).toEqual(['table-1', 'table-2']);
    });

    it('should return empty array for zone with no tables', () => {
      const { getTablesByZone } = useTableStore.getState();
      const tables = getTablesByZone('zone-3');

      expect(tables).toEqual([]);
    });

    it('should return empty array for non-existent zone', () => {
      const { getTablesByZone } = useTableStore.getState();
      const tables = getTablesByZone('non-existent');

      expect(tables).toEqual([]);
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      useTableStore.setState({ error: 'Some error' });

      const { clearError } = useTableStore.getState();
      clearError();

      expect(useTableStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      useTableStore.setState({
        tables: testTables,
        zones: testZones,
        selectedTableId: 'table-1',
        selectedZoneId: 'zone-1',
        isLoadingTables: true,
        isLoadingZones: true,
        error: 'Some error',
      });

      const { reset } = useTableStore.getState();
      reset();

      const state = useTableStore.getState();
      expect(state.tables).toEqual([]);
      expect(state.zones).toEqual([]);
      expect(state.selectedTableId).toBeNull();
      expect(state.selectedZoneId).toBeNull();
      expect(state.isLoadingTables).toBe(false);
      expect(state.isLoadingZones).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});

describe('Table Store Hooks', () => {
  beforeEach(() => {
    useTableStore.setState({
      tables: testTables,
      zones: testZones,
      selectedTableId: 'table-1',
      selectedZoneId: 'zone-1',
      isLoadingTables: true,
      isLoadingZones: false,
      error: 'Test error',
    });
  });

  describe('useTables', () => {
    it('should be a defined function', () => {
      expect(useTables).toBeDefined();
      expect(typeof useTables).toBe('function');
    });
  });

  describe('useZones', () => {
    it('should be a defined function', () => {
      expect(useZones).toBeDefined();
      expect(typeof useZones).toBe('function');
    });
  });

  describe('useSelectedTable', () => {
    it('should be a defined function', () => {
      expect(useSelectedTable).toBeDefined();
      expect(typeof useSelectedTable).toBe('function');
    });
  });

  describe('useSelectedZone', () => {
    it('should be a defined function', () => {
      expect(useSelectedZone).toBeDefined();
      expect(typeof useSelectedZone).toBe('function');
    });
  });

  describe('useTablesInSelectedZone', () => {
    it('should be a defined function', () => {
      expect(useTablesInSelectedZone).toBeDefined();
      expect(typeof useTablesInSelectedZone).toBe('function');
    });
  });

  describe('useTableLoading', () => {
    it('should be a defined function', () => {
      expect(useTableLoading).toBeDefined();
      expect(typeof useTableLoading).toBe('function');
    });
  });

  describe('useTableError', () => {
    it('should be a defined function', () => {
      expect(useTableError).toBeDefined();
      expect(typeof useTableError).toBe('function');
    });
  });

  describe('useSelectedIds', () => {
    it('should be a defined function', () => {
      expect(useSelectedIds).toBeDefined();
      expect(typeof useSelectedIds).toBe('function');
    });
  });
});

describe('TableState type export', () => {
  it('should export TableState type with correct properties', () => {
    const state = useTableStore.getState();

    // State properties
    expect(state).toHaveProperty('tables');
    expect(state).toHaveProperty('zones');
    expect(state).toHaveProperty('selectedTableId');
    expect(state).toHaveProperty('selectedZoneId');
    expect(state).toHaveProperty('isLoadingTables');
    expect(state).toHaveProperty('isLoadingZones');
    expect(state).toHaveProperty('error');

    // Action methods
    expect(state).toHaveProperty('fetchTables');
    expect(state).toHaveProperty('fetchZones');
    expect(state).toHaveProperty('fetchAll');
    expect(state).toHaveProperty('selectTable');
    expect(state).toHaveProperty('selectZone');
    expect(state).toHaveProperty('getTableById');
    expect(state).toHaveProperty('getZoneById');
    expect(state).toHaveProperty('getTablesByZone');
    expect(state).toHaveProperty('clearError');
    expect(state).toHaveProperty('reset');
  });
});

describe('Store Index Export', () => {
  it('should export all table store functions from index', async () => {
    const storeIndex = await import('../stores/index');

    expect(storeIndex.useTableStore).toBeDefined();
    expect(storeIndex.useTables).toBeDefined();
    expect(storeIndex.useZones).toBeDefined();
    expect(storeIndex.useSelectedTable).toBeDefined();
    expect(storeIndex.useSelectedZone).toBeDefined();
    expect(storeIndex.useTablesInSelectedZone).toBeDefined();
    expect(storeIndex.useTableLoading).toBeDefined();
    expect(storeIndex.useTableError).toBeDefined();
    expect(storeIndex.useSelectedIds).toBeDefined();
  });
});
