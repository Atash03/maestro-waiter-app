/**
 * Tests for React Query hooks for Tables and Zones
 *
 * This file tests the useTableQueries hooks to ensure they:
 * 1. Return correct query keys
 * 2. Fetch data using the correct API endpoints
 * 3. Handle caching and refetching properly
 * 4. Provide proper utility functions
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type React from 'react';
import { initializeApiClient, resetApiClient } from '../services/api/client';
import type { Table, Zone } from '../types/models';

// Mock axios
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
  };
});

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Sample test data
const mockZones: Zone[] = [
  {
    id: 'zone-1',
    title: { en: 'Main Hall', ru: 'Главный зал', tm: 'Baş zal' },
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
    title: { en: 'VIP Room', ru: 'VIP комната', tm: 'VIP otag' },
    isActive: false,
    x: '0',
    y: '100',
  },
];

const mockTables: Table[] = [
  {
    id: 'table-1',
    title: 'Table 1',
    capacity: 4,
    zoneId: 'zone-1',
    x: '10',
    y: '10',
    width: '50',
    height: '50',
    color: '#ffffff',
  },
  {
    id: 'table-2',
    title: 'Table 2',
    capacity: 2,
    zoneId: 'zone-1',
    x: '70',
    y: '10',
    width: '40',
    height: '40',
    color: '#ffffff',
  },
  {
    id: 'table-3',
    title: 'VIP Table',
    capacity: 8,
    zoneId: 'zone-2',
    x: '10',
    y: '10',
    width: '80',
    height: '60',
    color: '#gold',
  },
];

describe('Table Query Hooks', () => {
  let mockAxiosInstance: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };
  let queryClient: QueryClient;

  // Create wrapper component with QueryClientProvider
  const createWrapper = () => {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
  };

  beforeEach(() => {
    // Reset API client
    resetApiClient();
    initializeApiClient({ baseURL: 'http://localhost:3000/api/v1' });

    // Get reference to the mocked axios instance
    const axios = require('axios');
    mockAxiosInstance = axios.create();

    // Reset all mocks
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.put.mockReset();
    mockAxiosInstance.patch.mockReset();
    mockAxiosInstance.delete.mockReset();

    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
  });

  afterEach(() => {
    resetApiClient();
    queryClient.clear();
  });

  describe('Query Keys', () => {
    const { tableQueryKeys, zoneQueryKeys } = require('../hooks/useTableQueries');

    it('tableQueryKeys.all should return base key', () => {
      expect(tableQueryKeys.all).toEqual(['tables']);
    });

    it('tableQueryKeys.lists() should return list key', () => {
      expect(tableQueryKeys.lists()).toEqual(['tables', 'list']);
    });

    it('tableQueryKeys.list(params) should include params in key', () => {
      const params = { zoneId: 'zone-1', search: 'VIP' };
      expect(tableQueryKeys.list(params)).toEqual(['tables', 'list', params]);
    });

    it('tableQueryKeys.list() without params should return key with undefined', () => {
      expect(tableQueryKeys.list()).toEqual(['tables', 'list', undefined]);
    });

    it('tableQueryKeys.details() should return details key', () => {
      expect(tableQueryKeys.details()).toEqual(['tables', 'detail']);
    });

    it('tableQueryKeys.detail(id) should include id in key', () => {
      expect(tableQueryKeys.detail('table-1')).toEqual(['tables', 'detail', 'table-1']);
    });

    it('zoneQueryKeys.all should return base key', () => {
      expect(zoneQueryKeys.all).toEqual(['zones']);
    });

    it('zoneQueryKeys.lists() should return list key', () => {
      expect(zoneQueryKeys.lists()).toEqual(['zones', 'list']);
    });

    it('zoneQueryKeys.list(params) should include params in key', () => {
      const params = { isActive: true, search: 'Hall' };
      expect(zoneQueryKeys.list(params)).toEqual(['zones', 'list', params]);
    });

    it('zoneQueryKeys.details() should return details key', () => {
      expect(zoneQueryKeys.details()).toEqual(['zones', 'detail']);
    });

    it('zoneQueryKeys.detail(id) should include id in key', () => {
      expect(zoneQueryKeys.detail('zone-1')).toEqual(['zones', 'detail', 'zone-1']);
    });
  });

  describe('useTables hook', () => {
    const { useTables } = require('../hooks/useTableQueries');

    it('should fetch tables successfully', async () => {
      const mockResponse = { data: mockTables, total: mockTables.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useTables(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/table', undefined);
      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.data).toHaveLength(3);
    });

    it('should fetch tables with params', async () => {
      const mockResponse = {
        data: mockTables.filter((t) => t.zoneId === 'zone-1'),
        total: 2,
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useTables({ params: { zoneId: 'zone-1' } }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/table?zoneId=zone-1', undefined);
      expect(result.current.data?.data).toHaveLength(2);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTables(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useTable hook', () => {
    const { useTable } = require('../hooks/useTableQueries');

    it('should fetch single table by ID', async () => {
      const mockTable = mockTables[0];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTable });

      const { result } = renderHook(() => useTable({ id: 'table-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/table/table-1', undefined);
      expect(result.current.data).toEqual(mockTable);
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useTable({ id: '' }), {
        wrapper: createWrapper(),
      });

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });
  });

  describe('useZones hook', () => {
    const { useZones } = require('../hooks/useTableQueries');

    it('should fetch zones successfully', async () => {
      const mockResponse = { data: mockZones, total: mockZones.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useZones(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/zone', undefined);
      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.data).toHaveLength(3);
    });

    it('should fetch active zones only', async () => {
      const activeZones = mockZones.filter((z) => z.isActive);
      const mockResponse = { data: activeZones, total: activeZones.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useZones({ params: { isActive: true } }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/zone?isActive=true', undefined);
      expect(result.current.data?.data).toHaveLength(2);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Server error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useZones(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useZone hook', () => {
    const { useZone } = require('../hooks/useTableQueries');

    it('should fetch single zone by ID', async () => {
      const mockZone = mockZones[0];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockZone });

      const { result } = renderHook(() => useZone({ id: 'zone-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/zone/zone-1', undefined);
      expect(result.current.data).toEqual(mockZone);
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useZone({ id: '' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });
  });

  describe('useTablesAndZones hook', () => {
    const { useTablesAndZones } = require('../hooks/useTableQueries');

    it('should fetch both tables and zones', async () => {
      const tablesResponse = { data: mockTables, total: mockTables.length };
      const zonesResponse = { data: mockZones, total: mockZones.length };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: tablesResponse })
        .mockResolvedValueOnce({ data: zonesResponse });

      const { result } = renderHook(() => useTablesAndZones(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.tables.isSuccess).toBe(true);
        expect(result.current.zones.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.tables.data?.data).toHaveLength(3);
      expect(result.current.zones.data?.data).toHaveLength(3);
    });

    it('should report combined error', async () => {
      const error = new Error('API error');
      mockAxiosInstance.get.mockRejectedValue(error);

      const { result } = renderHook(() => useTablesAndZones(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });

    it('should have refetchAll function', async () => {
      const tablesResponse = { data: mockTables, total: mockTables.length };
      const zonesResponse = { data: mockZones, total: mockZones.length };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: tablesResponse })
        .mockResolvedValueOnce({ data: zonesResponse })
        .mockResolvedValueOnce({ data: tablesResponse })
        .mockResolvedValueOnce({ data: zonesResponse });

      const { result } = renderHook(() => useTablesAndZones(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.tables.isSuccess).toBe(true);
        expect(result.current.zones.isSuccess).toBe(true);
      });

      expect(typeof result.current.refetchAll).toBe('function');

      // Call refetchAll
      await result.current.refetchAll();

      // Should have been called 4 times total (2 initial + 2 refetch)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('useTablesByZone utility', () => {
    const { useTablesByZone } = require('../hooks/useTableQueries');

    it('should filter tables by zone ID', () => {
      const { result } = renderHook(() => useTablesByZone(mockTables, 'zone-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(2);
      expect(result.current.every((t: Table) => t.zoneId === 'zone-1')).toBe(true);
    });

    it('should return all tables when zoneId is undefined', () => {
      const { result } = renderHook(() => useTablesByZone(mockTables, undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(3);
    });

    it('should return empty array when tables is undefined', () => {
      const { result } = renderHook(() => useTablesByZone(undefined, 'zone-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual([]);
    });

    it('should return empty array when no tables match zone', () => {
      const { result } = renderHook(() => useTablesByZone(mockTables, 'non-existent-zone'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(0);
    });
  });

  describe('useTableCacheActions hook', () => {
    const { useTableCacheActions, tableQueryKeys, zoneQueryKeys } =
      require('../hooks/useTableQueries');

    it('should return cache action functions', () => {
      const { result } = renderHook(() => useTableCacheActions(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.invalidateTables).toBe('function');
      expect(typeof result.current.invalidateZones).toBe('function');
      expect(typeof result.current.invalidateAll).toBe('function');
      expect(typeof result.current.prefetchTables).toBe('function');
      expect(typeof result.current.prefetchZones).toBe('function');
      expect(typeof result.current.prefetchAll).toBe('function');
    });

    it('invalidateTables should invalidate table queries', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTableCacheActions(), {
        wrapper: createWrapper(),
      });

      result.current.invalidateTables();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: tableQueryKeys.all,
      });
    });

    it('invalidateTables with params should invalidate specific query', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTableCacheActions(), {
        wrapper: createWrapper(),
      });

      const params = { zoneId: 'zone-1' };
      result.current.invalidateTables(params);

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: tableQueryKeys.list(params),
      });
    });

    it('invalidateZones should invalidate zone queries', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTableCacheActions(), {
        wrapper: createWrapper(),
      });

      result.current.invalidateZones();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: zoneQueryKeys.all,
      });
    });

    it('invalidateAll should invalidate both tables and zones', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTableCacheActions(), {
        wrapper: createWrapper(),
      });

      result.current.invalidateAll();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: tableQueryKeys.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: zoneQueryKeys.all,
      });
    });

    it('prefetchTables should prefetch table data', async () => {
      const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');
      const mockResponse = { data: mockTables, total: mockTables.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useTableCacheActions(), {
        wrapper: createWrapper(),
      });

      await result.current.prefetchTables();

      expect(prefetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: tableQueryKeys.list(undefined),
        })
      );
    });

    it('prefetchZones should prefetch zone data', async () => {
      const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');
      const mockResponse = { data: mockZones, total: mockZones.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useTableCacheActions(), {
        wrapper: createWrapper(),
      });

      await result.current.prefetchZones();

      expect(prefetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: zoneQueryKeys.list(undefined),
        })
      );
    });

    it('prefetchAll should prefetch both tables and zones', async () => {
      const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');
      const tablesResponse = { data: mockTables, total: mockTables.length };
      const zonesResponse = { data: mockZones, total: mockZones.length };
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: tablesResponse })
        .mockResolvedValueOnce({ data: zonesResponse });

      const { result } = renderHook(() => useTableCacheActions(), {
        wrapper: createWrapper(),
      });

      await result.current.prefetchAll();

      expect(prefetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Hook Exports', () => {
    it('should export all hooks from useTableQueries', () => {
      const exports = require('../hooks/useTableQueries');

      expect(exports.tableQueryKeys).toBeDefined();
      expect(exports.zoneQueryKeys).toBeDefined();
      expect(exports.useTables).toBeDefined();
      expect(exports.useTable).toBeDefined();
      expect(exports.useZones).toBeDefined();
      expect(exports.useZone).toBeDefined();
      expect(exports.useTablesAndZones).toBeDefined();
      expect(exports.useTablesByZone).toBeDefined();
      expect(exports.useTableCacheActions).toBeDefined();
    });

    it('should export all hooks from hooks index', () => {
      const hooksIndex = require('../hooks/index');

      expect(hooksIndex.tableQueryKeys).toBeDefined();
      expect(hooksIndex.zoneQueryKeys).toBeDefined();
      expect(hooksIndex.useTables).toBeDefined();
      expect(hooksIndex.useTable).toBeDefined();
      expect(hooksIndex.useZones).toBeDefined();
      expect(hooksIndex.useZone).toBeDefined();
      expect(hooksIndex.useTablesAndZones).toBeDefined();
      expect(hooksIndex.useTablesByZone).toBeDefined();
      expect(hooksIndex.useTableCacheActions).toBeDefined();
    });
  });
});
