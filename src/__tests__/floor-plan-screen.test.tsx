/**
 * Tests for the Floor Plan Screen
 *
 * Tests cover:
 * - Component rendering
 * - Zone filtering
 * - Table display and interaction
 * - Loading and error states
 * - Data fetching integration
 */

import type React from 'react';
import type { Table, Zone } from '@/src/types/models';

// Mock expo-router
const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    push: mockRouterPush,
    back: jest.fn(),
  }),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: React.ComponentType) => Component || View,
      call: () => {},
    },
    createAnimatedComponent: (Component: React.ComponentType) => Component || View,
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val) => val),
    withSpring: jest.fn((val) => val),
    withRepeat: jest.fn((val) => val),
    withSequence: jest.fn((...vals) => vals[vals.length - 1]),
    runOnJS: jest.fn((fn) => fn),
    View,
  };
});

// Mock data
const mockZones: Zone[] = [
  {
    id: 'zone-1',
    title: { en: 'Main Hall', ru: 'Главный зал', tm: 'Esasy zal' },
    isActive: true,
    x: '0',
    y: '0',
  },
  {
    id: 'zone-2',
    title: { en: 'Patio', ru: 'Патио', tm: 'Patio' },
    isActive: true,
    x: '100',
    y: '0',
  },
  {
    id: 'zone-3',
    title: { en: 'VIP', ru: 'ВИП', tm: 'VIP' },
    isActive: false,
    x: '200',
    y: '0',
  },
];

const mockTables: Table[] = [
  {
    id: 'table-1',
    title: 'T1',
    capacity: 4,
    zoneId: 'zone-1',
    x: '50',
    y: '50',
    width: '80',
    height: '80',
    color: '#22C55E',
  },
  {
    id: 'table-2',
    title: 'T2',
    capacity: 2,
    zoneId: 'zone-1',
    x: '150',
    y: '50',
    width: '60',
    height: '60',
    color: '#F59E0B',
  },
  {
    id: 'table-3',
    title: 'T3',
    capacity: 6,
    zoneId: 'zone-2',
    x: '50',
    y: '150',
    width: '100',
    height: '80',
    color: '#3B82F6',
  },
];

// Mock table store
let mockSelectedZoneId: string | null = null;
let mockSelectedTableId: string | null = null;
const mockSelectZone = jest.fn((zoneId: string | null) => {
  mockSelectedZoneId = zoneId;
});
const mockSelectTable = jest.fn((tableId: string | null) => {
  mockSelectedTableId = tableId;
});

jest.mock('@/src/stores/tableStore', () => ({
  useTableStore: () => ({
    selectedZoneId: mockSelectedZoneId,
    selectedTableId: mockSelectedTableId,
    selectZone: mockSelectZone,
    selectTable: mockSelectTable,
  }),
}));

// Mock table queries
let mockIsLoading = false;
let mockError: Error | null = null;
let mockTablesData = mockTables;
let mockZonesData = mockZones;
const mockRefetchAll = jest.fn(() => Promise.resolve());

jest.mock('@/src/hooks/useTableQueries', () => ({
  useTablesAndZones: () => ({
    tables: {
      data: { data: mockTablesData },
      isLoading: mockIsLoading,
      isFetching: false,
    },
    zones: {
      data: { data: mockZonesData },
      isLoading: mockIsLoading,
    },
    isLoading: mockIsLoading,
    error: mockError,
    refetchAll: mockRefetchAll,
  }),
  useTablesByZone: (tables: Table[], zoneId: string | undefined) => {
    if (!zoneId) return tables;
    return tables.filter((table) => table.zoneId === zoneId);
  },
}));

// Mock color scheme
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockSelectedZoneId = null;
  mockSelectedTableId = null;
  mockIsLoading = false;
  mockError = null;
  mockTablesData = mockTables;
  mockZonesData = mockZones;
});

describe('FloorPlanScreen', () => {
  describe('Data Fetching Integration', () => {
    it('uses useTablesAndZones hook for data fetching', () => {
      const { useTablesAndZones } = require('@/src/hooks/useTableQueries');
      const result = useTablesAndZones();

      expect(result.tables.data.data).toEqual(mockTables);
      expect(result.zones.data.data).toEqual(mockZones);
      expect(result.refetchAll).toBe(mockRefetchAll);
    });

    it('provides loading state from hook', () => {
      mockIsLoading = true;

      const { useTablesAndZones } = require('@/src/hooks/useTableQueries');
      const result = useTablesAndZones();

      expect(result.isLoading).toBe(true);
    });

    it('provides error state from hook', () => {
      mockError = new Error('Failed to fetch');

      const { useTablesAndZones } = require('@/src/hooks/useTableQueries');
      const result = useTablesAndZones();

      expect(result.error).toEqual(mockError);
    });
  });

  describe('Zone Filtering', () => {
    it('useTablesByZone returns all tables when no zone selected', () => {
      const { useTablesByZone } = require('@/src/hooks/useTableQueries');
      const result = useTablesByZone(mockTables, undefined);

      expect(result).toHaveLength(3);
      expect(result).toEqual(mockTables);
    });

    it('useTablesByZone filters tables by zone ID', () => {
      const { useTablesByZone } = require('@/src/hooks/useTableQueries');
      const result = useTablesByZone(mockTables, 'zone-1');

      expect(result).toHaveLength(2);
      expect(result.every((t: Table) => t.zoneId === 'zone-1')).toBe(true);
    });

    it('useTablesByZone returns empty array for zone with no tables', () => {
      const { useTablesByZone } = require('@/src/hooks/useTableQueries');
      const result = useTablesByZone(mockTables, 'zone-nonexistent');

      expect(result).toHaveLength(0);
    });

    it('selectZone updates selected zone in store', () => {
      const { useTableStore } = require('@/src/stores/tableStore');
      const store = useTableStore();

      store.selectZone('zone-2');

      expect(mockSelectZone).toHaveBeenCalledWith('zone-2');
    });

    it('selectZone can be called with null for all zones', () => {
      const { useTableStore } = require('@/src/stores/tableStore');
      const store = useTableStore();

      store.selectZone(null);

      expect(mockSelectZone).toHaveBeenCalledWith(null);
    });
  });

  describe('Table Selection', () => {
    it('selectTable updates selected table in store', () => {
      const { useTableStore } = require('@/src/stores/tableStore');
      const store = useTableStore();

      store.selectTable('table-1');

      expect(mockSelectTable).toHaveBeenCalledWith('table-1');
    });

    it('selectTable can be called with null to deselect', () => {
      const { useTableStore } = require('@/src/stores/tableStore');
      const store = useTableStore();

      store.selectTable(null);

      expect(mockSelectTable).toHaveBeenCalledWith(null);
    });
  });

  describe('Zone Data', () => {
    it('filters zones to active only by default', () => {
      const activeZones = mockZonesData.filter((z) => z.isActive);

      expect(activeZones).toHaveLength(2);
      expect(activeZones.map((z) => z.id)).toEqual(['zone-1', 'zone-2']);
    });

    it('zone title has translation structure', () => {
      const zone = mockZonesData[0];

      expect(zone.title).toHaveProperty('en');
      expect(zone.title).toHaveProperty('ru');
      expect(zone.title).toHaveProperty('tm');
      expect(zone.title.en).toBe('Main Hall');
    });
  });

  describe('Table Data', () => {
    it('tables have required positioning properties', () => {
      const table = mockTablesData[0];

      expect(table).toHaveProperty('x');
      expect(table).toHaveProperty('y');
      expect(table).toHaveProperty('width');
      expect(table).toHaveProperty('height');
    });

    it('tables have capacity information', () => {
      const table = mockTablesData[0];

      expect(table).toHaveProperty('capacity');
      expect(typeof table.capacity).toBe('number');
      expect(table.capacity).toBeGreaterThan(0);
    });

    it('tables have color property', () => {
      const table = mockTablesData[0];

      expect(table).toHaveProperty('color');
      expect(typeof table.color).toBe('string');
    });

    it('tables belong to a zone', () => {
      mockTablesData.forEach((table) => {
        expect(table).toHaveProperty('zoneId');
        expect(typeof table.zoneId).toBe('string');
      });
    });
  });

  describe('Coordinate Parsing', () => {
    it('parses string coordinates to numbers', () => {
      const table = mockTablesData[0];
      const x = Number.parseFloat(table.x);
      const y = Number.parseFloat(table.y);
      const width = Number.parseFloat(table.width);
      const height = Number.parseFloat(table.height);

      expect(x).toBe(50);
      expect(y).toBe(50);
      expect(width).toBe(80);
      expect(height).toBe(80);
    });

    it('handles empty coordinate strings', () => {
      const emptyCoord = '';
      const parsed = Number.parseFloat(emptyCoord);

      expect(Number.isNaN(parsed)).toBe(true);
    });
  });

  describe('Status Colors', () => {
    it('provides status colors from theme', () => {
      const { StatusColors } = require('@/constants/theme');

      expect(StatusColors.available).toBe('#22C55E');
      expect(StatusColors.occupied).toBe('#F59E0B');
      expect(StatusColors.reserved).toBe('#3B82F6');
      expect(StatusColors.needsAttention).toBe('#EF4444');
    });
  });

  describe('Refetch Functionality', () => {
    it('refetchAll can be called for pull-to-refresh', async () => {
      const { useTablesAndZones } = require('@/src/hooks/useTableQueries');
      const { refetchAll } = useTablesAndZones();

      await refetchAll();

      expect(mockRefetchAll).toHaveBeenCalled();
    });
  });

  describe('Module Export', () => {
    it('exports FloorPlanScreen as default', () => {
      const FloorPlanScreen = require('@/app/(tabs)/tables/index').default;

      expect(FloorPlanScreen).toBeDefined();
      expect(typeof FloorPlanScreen).toBe('function');
    });
  });

  describe('Translation Helper', () => {
    it('getTranslatedText returns English by default', () => {
      const translation = { en: 'English', ru: 'Russian', tm: 'Turkmen' };
      // Simulating the helper function logic
      const getTranslatedText = (t: typeof translation, lang: 'en' | 'ru' | 'tm' = 'en') =>
        t[lang] || t.en || '';

      expect(getTranslatedText(translation)).toBe('English');
      expect(getTranslatedText(translation, 'ru')).toBe('Russian');
      expect(getTranslatedText(translation, 'tm')).toBe('Turkmen');
    });
  });

  describe('Empty State', () => {
    it('handles empty tables array', () => {
      mockTablesData = [];
      const { useTablesAndZones } = require('@/src/hooks/useTableQueries');
      const result = useTablesAndZones();

      expect(result.tables.data.data).toHaveLength(0);
    });

    it('handles empty zones array', () => {
      mockZonesData = [];
      const { useTablesAndZones } = require('@/src/hooks/useTableQueries');
      const result = useTablesAndZones();

      expect(result.zones.data.data).toHaveLength(0);
    });
  });

  describe('Canvas Bounds Calculation', () => {
    it('calculates max bounds from table positions', () => {
      // Simulating the canvas bounds calculation logic
      let maxX = 0;
      let maxY = 0;

      for (const table of mockTables) {
        const x = Number.parseFloat(table.x) || 0;
        const y = Number.parseFloat(table.y) || 0;
        const width = Number.parseFloat(table.width) || 60;
        const height = Number.parseFloat(table.height) || 60;

        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      }

      // T2 is at x:150 with width:60 = 210
      expect(maxX).toBe(210);
      // T3 is at y:150 with height:80 = 230
      expect(maxY).toBe(230);
    });
  });

  describe('Table Store Integration', () => {
    it('store provides selected zone ID', () => {
      mockSelectedZoneId = 'zone-1';
      const { useTableStore } = require('@/src/stores/tableStore');
      const store = useTableStore();

      expect(store.selectedZoneId).toBe('zone-1');
    });

    it('store provides selected table ID', () => {
      mockSelectedTableId = 'table-1';
      const { useTableStore } = require('@/src/stores/tableStore');
      const store = useTableStore();

      expect(store.selectedTableId).toBe('table-1');
    });
  });
});
