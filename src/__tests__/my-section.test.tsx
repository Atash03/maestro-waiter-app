/**
 * Tests for "My Section" View Feature (Task 2.7)
 *
 * Tests the view mode toggle, assigned table filtering,
 * and table assignment indicator functionality.
 */

import { act, renderHook } from '@testing-library/react-native';
import {
  type TableViewMode,
  useAssignedTableIds,
  useAssignedTables,
  useIsTableAssigned,
  useTableStore,
  useTablesByViewMode,
  useViewMode,
  useViewModeToggle,
} from '../stores/tableStore';
import type { Table } from '../types/models';

// Mock API calls
jest.mock('../services/api/tables', () => ({
  getTables: jest.fn(),
}));

jest.mock('../services/api/zones', () => ({
  getZones: jest.fn(),
}));

// Sample table data for testing
const createMockTable = (id: string, zoneId = 'zone1'): Table => ({
  id,
  title: `Table ${id}`,
  capacity: 4,
  zoneId,
  x: '100',
  y: '100',
  width: '60',
  height: '60',
  color: '#F94623',
});

describe('My Section View Feature', () => {
  beforeEach(() => {
    // Reset the store before each test
    useTableStore.getState().reset();
  });

  describe('TableStore - View Mode State', () => {
    it('should have "all" as the default view mode', () => {
      const { viewMode } = useTableStore.getState();
      expect(viewMode).toBe('all');
    });

    it('should have empty assignedTableIds by default', () => {
      const { assignedTableIds } = useTableStore.getState();
      expect(assignedTableIds.size).toBe(0);
    });
  });

  describe('TableStore - setViewMode', () => {
    it('should set view mode to "mySection"', () => {
      const { setViewMode } = useTableStore.getState();

      act(() => {
        setViewMode('mySection');
      });

      const { viewMode } = useTableStore.getState();
      expect(viewMode).toBe('mySection');
    });

    it('should set view mode back to "all"', () => {
      const { setViewMode } = useTableStore.getState();

      act(() => {
        setViewMode('mySection');
        setViewMode('all');
      });

      const { viewMode } = useTableStore.getState();
      expect(viewMode).toBe('all');
    });
  });

  describe('TableStore - toggleViewMode', () => {
    it('should toggle from "all" to "mySection"', () => {
      const { toggleViewMode } = useTableStore.getState();

      act(() => {
        toggleViewMode();
      });

      const { viewMode } = useTableStore.getState();
      expect(viewMode).toBe('mySection');
    });

    it('should toggle from "mySection" to "all"', () => {
      const store = useTableStore.getState();

      act(() => {
        store.setViewMode('mySection');
        store.toggleViewMode();
      });

      const { viewMode } = useTableStore.getState();
      expect(viewMode).toBe('all');
    });

    it('should toggle multiple times correctly', () => {
      const { toggleViewMode } = useTableStore.getState();

      act(() => {
        toggleViewMode(); // all -> mySection
      });
      expect(useTableStore.getState().viewMode).toBe('mySection');

      act(() => {
        useTableStore.getState().toggleViewMode(); // mySection -> all
      });
      expect(useTableStore.getState().viewMode).toBe('all');

      act(() => {
        useTableStore.getState().toggleViewMode(); // all -> mySection
      });
      expect(useTableStore.getState().viewMode).toBe('mySection');
    });
  });

  describe('TableStore - setAssignedTableIds', () => {
    it('should set assigned table IDs', () => {
      const { setAssignedTableIds } = useTableStore.getState();

      act(() => {
        setAssignedTableIds(['table1', 'table2', 'table3']);
      });

      const { assignedTableIds } = useTableStore.getState();
      expect(assignedTableIds.size).toBe(3);
      expect(assignedTableIds.has('table1')).toBe(true);
      expect(assignedTableIds.has('table2')).toBe(true);
      expect(assignedTableIds.has('table3')).toBe(true);
    });

    it('should replace existing assigned table IDs', () => {
      const store = useTableStore.getState();

      act(() => {
        store.setAssignedTableIds(['table1', 'table2']);
        store.setAssignedTableIds(['table3', 'table4']);
      });

      const { assignedTableIds } = useTableStore.getState();
      expect(assignedTableIds.size).toBe(2);
      expect(assignedTableIds.has('table1')).toBe(false);
      expect(assignedTableIds.has('table3')).toBe(true);
      expect(assignedTableIds.has('table4')).toBe(true);
    });

    it('should handle empty array', () => {
      const store = useTableStore.getState();

      act(() => {
        store.setAssignedTableIds(['table1', 'table2']);
        store.setAssignedTableIds([]);
      });

      const { assignedTableIds } = useTableStore.getState();
      expect(assignedTableIds.size).toBe(0);
    });
  });

  describe('TableStore - addAssignedTableId', () => {
    it('should add a table ID to assigned tables', () => {
      const { addAssignedTableId } = useTableStore.getState();

      act(() => {
        addAssignedTableId('table1');
      });

      const { assignedTableIds } = useTableStore.getState();
      expect(assignedTableIds.has('table1')).toBe(true);
    });

    it('should add multiple table IDs', () => {
      const store = useTableStore.getState();

      act(() => {
        store.addAssignedTableId('table1');
        store.addAssignedTableId('table2');
        store.addAssignedTableId('table3');
      });

      const { assignedTableIds } = useTableStore.getState();
      expect(assignedTableIds.size).toBe(3);
    });

    it('should not duplicate existing table IDs', () => {
      const store = useTableStore.getState();

      act(() => {
        store.addAssignedTableId('table1');
        store.addAssignedTableId('table1');
      });

      const { assignedTableIds } = useTableStore.getState();
      expect(assignedTableIds.size).toBe(1);
    });
  });

  describe('TableStore - removeAssignedTableId', () => {
    it('should remove a table ID from assigned tables', () => {
      const store = useTableStore.getState();

      act(() => {
        store.setAssignedTableIds(['table1', 'table2', 'table3']);
        store.removeAssignedTableId('table2');
      });

      const { assignedTableIds } = useTableStore.getState();
      expect(assignedTableIds.size).toBe(2);
      expect(assignedTableIds.has('table2')).toBe(false);
    });

    it('should handle removing non-existent table ID', () => {
      const store = useTableStore.getState();

      act(() => {
        store.setAssignedTableIds(['table1', 'table2']);
        store.removeAssignedTableId('table999');
      });

      const { assignedTableIds } = useTableStore.getState();
      expect(assignedTableIds.size).toBe(2);
    });
  });

  describe('TableStore - isTableAssigned', () => {
    it('should return true for assigned table', () => {
      const store = useTableStore.getState();

      act(() => {
        store.setAssignedTableIds(['table1', 'table2']);
      });

      expect(useTableStore.getState().isTableAssigned('table1')).toBe(true);
    });

    it('should return false for unassigned table', () => {
      const store = useTableStore.getState();

      act(() => {
        store.setAssignedTableIds(['table1', 'table2']);
      });

      expect(useTableStore.getState().isTableAssigned('table999')).toBe(false);
    });
  });

  describe('TableStore - getAssignedTables', () => {
    it('should return assigned tables', () => {
      const mockTables = [
        createMockTable('table1'),
        createMockTable('table2'),
        createMockTable('table3'),
      ];

      const store = useTableStore.getState();

      act(() => {
        useTableStore.setState({ tables: mockTables });
        store.setAssignedTableIds(['table1', 'table3']);
      });

      const assignedTables = useTableStore.getState().getAssignedTables();
      expect(assignedTables.length).toBe(2);
      expect(assignedTables.find((t) => t.id === 'table1')).toBeDefined();
      expect(assignedTables.find((t) => t.id === 'table3')).toBeDefined();
    });

    it('should return empty array when no tables assigned', () => {
      const mockTables = [createMockTable('table1'), createMockTable('table2')];

      act(() => {
        useTableStore.setState({ tables: mockTables });
      });

      const assignedTables = useTableStore.getState().getAssignedTables();
      expect(assignedTables.length).toBe(0);
    });

    it('should return empty array when no tables exist', () => {
      const store = useTableStore.getState();

      act(() => {
        store.setAssignedTableIds(['table1', 'table2']);
      });

      const assignedTables = useTableStore.getState().getAssignedTables();
      expect(assignedTables.length).toBe(0);
    });
  });

  describe('TableStore - reset', () => {
    it('should reset view mode to "all"', () => {
      const store = useTableStore.getState();

      act(() => {
        store.setViewMode('mySection');
        store.reset();
      });

      expect(useTableStore.getState().viewMode).toBe('all');
    });

    it('should clear assigned table IDs', () => {
      const store = useTableStore.getState();

      act(() => {
        store.setAssignedTableIds(['table1', 'table2']);
        store.reset();
      });

      expect(useTableStore.getState().assignedTableIds.size).toBe(0);
    });
  });

  describe('useViewMode hook', () => {
    it('should return current view mode', () => {
      const { result } = renderHook(() => useViewMode());
      expect(result.current).toBe('all');
    });

    it('should update when view mode changes', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        useTableStore.getState().setViewMode('mySection');
      });

      expect(result.current).toBe('mySection');
    });
  });

  describe('useAssignedTableIds hook', () => {
    it('should return assigned table IDs', () => {
      const { result } = renderHook(() => useAssignedTableIds());

      act(() => {
        useTableStore.getState().setAssignedTableIds(['table1', 'table2']);
      });

      expect(result.current.has('table1')).toBe(true);
      expect(result.current.has('table2')).toBe(true);
    });
  });

  describe('useAssignedTables hook', () => {
    it('should return assigned tables', () => {
      const mockTables = [createMockTable('table1'), createMockTable('table2')];

      act(() => {
        useTableStore.setState({ tables: mockTables });
        useTableStore.getState().setAssignedTableIds(['table1']);
      });

      const { result } = renderHook(() => useAssignedTables());
      expect(result.current.length).toBe(1);
      expect(result.current[0].id).toBe('table1');
    });
  });

  describe('useIsTableAssigned hook', () => {
    it('should return true for assigned table', () => {
      act(() => {
        useTableStore.getState().setAssignedTableIds(['table1']);
      });

      const { result } = renderHook(() => useIsTableAssigned('table1'));
      expect(result.current).toBe(true);
    });

    it('should return false for unassigned table', () => {
      act(() => {
        useTableStore.getState().setAssignedTableIds(['table1']);
      });

      const { result } = renderHook(() => useIsTableAssigned('table2'));
      expect(result.current).toBe(false);
    });
  });

  describe('useViewModeToggle hook', () => {
    it('should return view mode and toggle function', () => {
      const { result } = renderHook(() => useViewModeToggle());

      expect(result.current.viewMode).toBe('all');
      expect(typeof result.current.toggleViewMode).toBe('function');
      expect(typeof result.current.setViewMode).toBe('function');
    });

    it('should toggle view mode via hook', () => {
      const { result } = renderHook(() => useViewModeToggle());

      act(() => {
        result.current.toggleViewMode();
      });

      expect(result.current.viewMode).toBe('mySection');
    });
  });

  describe('useTablesByViewMode hook', () => {
    beforeEach(() => {
      const mockTables = [
        createMockTable('table1'),
        createMockTable('table2'),
        createMockTable('table3'),
      ];

      act(() => {
        useTableStore.setState({ tables: mockTables });
        useTableStore.getState().setAssignedTableIds(['table1', 'table3']);
      });
    });

    it('should return all tables when view mode is "all"', () => {
      act(() => {
        useTableStore.getState().setViewMode('all');
      });

      const { result } = renderHook(() => useTablesByViewMode());
      expect(result.current.length).toBe(3);
    });

    it('should return only assigned tables when view mode is "mySection"', () => {
      act(() => {
        useTableStore.getState().setViewMode('mySection');
      });

      const { result } = renderHook(() => useTablesByViewMode());
      expect(result.current.length).toBe(2);
      expect(result.current.find((t) => t.id === 'table1')).toBeDefined();
      expect(result.current.find((t) => t.id === 'table3')).toBeDefined();
      expect(result.current.find((t) => t.id === 'table2')).toBeUndefined();
    });
  });

  describe('TableViewMode type', () => {
    it('should accept "all" as valid view mode', () => {
      const mode: TableViewMode = 'all';
      expect(mode).toBe('all');
    });

    it('should accept "mySection" as valid view mode', () => {
      const mode: TableViewMode = 'mySection';
      expect(mode).toBe('mySection');
    });
  });

  describe('Store exports', () => {
    it('should export TableViewMode type', () => {
      // Type check - this will fail at compile time if the type is not exported
      const mode: TableViewMode = 'all';
      expect(mode).toBeDefined();
    });

    it('should export useViewMode hook', () => {
      expect(typeof useViewMode).toBe('function');
    });

    it('should export useAssignedTableIds hook', () => {
      expect(typeof useAssignedTableIds).toBe('function');
    });

    it('should export useAssignedTables hook', () => {
      expect(typeof useAssignedTables).toBe('function');
    });

    it('should export useIsTableAssigned hook', () => {
      expect(typeof useIsTableAssigned).toBe('function');
    });

    it('should export useViewModeToggle hook', () => {
      expect(typeof useViewModeToggle).toBe('function');
    });

    it('should export useTablesByViewMode hook', () => {
      expect(typeof useTablesByViewMode).toBe('function');
    });
  });

  describe('TableState interface', () => {
    it('should include viewMode property', () => {
      const state = useTableStore.getState();
      expect('viewMode' in state).toBe(true);
    });

    it('should include assignedTableIds property', () => {
      const state = useTableStore.getState();
      expect('assignedTableIds' in state).toBe(true);
    });

    it('should include setViewMode action', () => {
      const state = useTableStore.getState();
      expect(typeof state.setViewMode).toBe('function');
    });

    it('should include toggleViewMode action', () => {
      const state = useTableStore.getState();
      expect(typeof state.toggleViewMode).toBe('function');
    });

    it('should include setAssignedTableIds action', () => {
      const state = useTableStore.getState();
      expect(typeof state.setAssignedTableIds).toBe('function');
    });

    it('should include addAssignedTableId action', () => {
      const state = useTableStore.getState();
      expect(typeof state.addAssignedTableId).toBe('function');
    });

    it('should include removeAssignedTableId action', () => {
      const state = useTableStore.getState();
      expect(typeof state.removeAssignedTableId).toBe('function');
    });

    it('should include isTableAssigned action', () => {
      const state = useTableStore.getState();
      expect(typeof state.isTableAssigned).toBe('function');
    });

    it('should include getAssignedTables action', () => {
      const state = useTableStore.getState();
      expect(typeof state.getAssignedTables).toBe('function');
    });
  });
});
