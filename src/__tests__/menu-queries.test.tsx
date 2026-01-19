/**
 * Tests for React Query hooks for Menu data fetching
 *
 * This file tests the useMenuQueries hooks to ensure they:
 * 1. Return correct query keys
 * 2. Fetch data using the correct API endpoints
 * 3. Handle caching and refetching properly
 * 4. Provide proper utility functions
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type React from 'react';
import { initializeApiClient, resetApiClient } from '../services/api/client';
import { MenuCategoryType } from '../types/enums';
import type { Extra, MenuCategory, MenuItem } from '../types/models';

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

// Mock the menu store
const mockSetCategories = jest.fn();
const mockSetItems = jest.fn();
const mockSetExtras = jest.fn();

jest.mock('../stores/menuStore', () => ({
  useMenuStore: () => ({
    setCategories: mockSetCategories,
    setItems: mockSetItems,
    setExtras: mockSetExtras,
  }),
}));

// Sample test data
const mockCategories: MenuCategory[] = [
  {
    id: 'cat-1',
    title: { en: 'Appetizers', ru: 'Закуски', tm: 'Işdäaçarlar' },
    type: MenuCategoryType.KITCHEN,
    imagePath: null,
    parentId: null,
  },
  {
    id: 'cat-2',
    title: { en: 'Main Courses', ru: 'Основные блюда', tm: 'Esasy tagamlar' },
    type: MenuCategoryType.KITCHEN,
    imagePath: null,
    parentId: null,
  },
  {
    id: 'cat-3',
    title: { en: 'Drinks', ru: 'Напитки', tm: 'Içgiler' },
    type: MenuCategoryType.BAR,
    imagePath: null,
    parentId: null,
    children: [
      {
        id: 'cat-3-1',
        title: { en: 'Soft Drinks', ru: 'Безалкогольные', tm: 'Alkogolsyz' },
        type: MenuCategoryType.BAR,
        imagePath: null,
        parentId: 'cat-3',
      },
    ],
  },
];

const mockItems: MenuItem[] = [
  {
    id: 'item-1',
    title: { en: 'Caesar Salad', ru: 'Салат Цезарь', tm: 'Sezar salat' },
    description: { en: 'Fresh romaine lettuce', ru: 'Свежий салат романо', tm: 'Täze romaine' },
    price: '12.99',
    categoryId: 'cat-1',
    imagePath: null,
    isActive: true,
    isGroup: false,
  },
  {
    id: 'item-2',
    title: { en: 'Grilled Salmon', ru: 'Лосось на гриле', tm: 'Gril balyk' },
    description: { en: 'Wild-caught salmon', ru: 'Дикий лосось', tm: 'Ýabany balyk' },
    price: '24.99',
    categoryId: 'cat-2',
    imagePath: null,
    isActive: true,
    isGroup: false,
  },
  {
    id: 'item-3',
    title: { en: 'Pizza Margherita', ru: 'Пицца Маргарита', tm: 'Pizza Margherita' },
    description: {
      en: 'Classic Italian pizza',
      ru: 'Классическая итальянская пицца',
      tm: 'Italýan pizza',
    },
    price: '18.99',
    categoryId: 'cat-2',
    imagePath: null,
    isActive: true,
    isGroup: false,
  },
  {
    id: 'item-4',
    title: { en: 'Inactive Item', ru: 'Неактивный', tm: 'Işjeň däl' },
    price: '9.99',
    categoryId: 'cat-1',
    imagePath: null,
    isActive: false,
    isGroup: false,
  },
];

const mockExtras: Extra[] = [
  {
    id: 'extra-1',
    title: { en: 'Extra Cheese', ru: 'Доп. сыр', tm: 'Goşmaça peýnir' },
    actualPrice: '2.50',
    isActive: true,
  },
  {
    id: 'extra-2',
    title: { en: 'Bacon', ru: 'Бекон', tm: 'Bekon' },
    actualPrice: '3.00',
    isActive: true,
  },
  {
    id: 'extra-3',
    title: { en: 'Mushrooms', ru: 'Грибы', tm: 'Kömelek' },
    actualPrice: '1.50',
    isActive: false,
  },
];

describe('Menu Query Hooks', () => {
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
    mockSetCategories.mockReset();
    mockSetItems.mockReset();
    mockSetExtras.mockReset();

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
    const { menuCategoryQueryKeys, menuItemQueryKeys, extraQueryKeys } =
      require('../hooks/useMenuQueries');

    describe('menuCategoryQueryKeys', () => {
      it('all should return base key', () => {
        expect(menuCategoryQueryKeys.all).toEqual(['menuCategories']);
      });

      it('lists() should return list key', () => {
        expect(menuCategoryQueryKeys.lists()).toEqual(['menuCategories', 'list']);
      });

      it('list(params) should include params in key', () => {
        const params = { type: 'Kitchen', search: 'Main' };
        expect(menuCategoryQueryKeys.list(params)).toEqual(['menuCategories', 'list', params]);
      });

      it('list() without params should return key with undefined', () => {
        expect(menuCategoryQueryKeys.list()).toEqual(['menuCategories', 'list', undefined]);
      });

      it('details() should return details key', () => {
        expect(menuCategoryQueryKeys.details()).toEqual(['menuCategories', 'detail']);
      });

      it('detail(id) should include id in key', () => {
        expect(menuCategoryQueryKeys.detail('cat-1')).toEqual([
          'menuCategories',
          'detail',
          'cat-1',
        ]);
      });
    });

    describe('menuItemQueryKeys', () => {
      it('all should return base key', () => {
        expect(menuItemQueryKeys.all).toEqual(['menuItems']);
      });

      it('lists() should return list key', () => {
        expect(menuItemQueryKeys.lists()).toEqual(['menuItems', 'list']);
      });

      it('list(params) should include params in key', () => {
        const params = { categoryId: 'cat-1', isActive: true };
        expect(menuItemQueryKeys.list(params)).toEqual(['menuItems', 'list', params]);
      });

      it('list() without params should return key with undefined', () => {
        expect(menuItemQueryKeys.list()).toEqual(['menuItems', 'list', undefined]);
      });

      it('details() should return details key', () => {
        expect(menuItemQueryKeys.details()).toEqual(['menuItems', 'detail']);
      });

      it('detail(id) should include id in key', () => {
        expect(menuItemQueryKeys.detail('item-1')).toEqual(['menuItems', 'detail', 'item-1']);
      });
    });

    describe('extraQueryKeys', () => {
      it('all should return base key', () => {
        expect(extraQueryKeys.all).toEqual(['extras']);
      });

      it('lists() should return list key', () => {
        expect(extraQueryKeys.lists()).toEqual(['extras', 'list']);
      });

      it('list(params) should include params in key', () => {
        const params = { isActive: true, search: 'Cheese' };
        expect(extraQueryKeys.list(params)).toEqual(['extras', 'list', params]);
      });

      it('list() without params should return key with undefined', () => {
        expect(extraQueryKeys.list()).toEqual(['extras', 'list', undefined]);
      });

      it('details() should return details key', () => {
        expect(extraQueryKeys.details()).toEqual(['extras', 'detail']);
      });

      it('detail(id) should include id in key', () => {
        expect(extraQueryKeys.detail('extra-1')).toEqual(['extras', 'detail', 'extra-1']);
      });
    });
  });

  describe('useMenuCategories hook', () => {
    const { useMenuCategories } = require('../hooks/useMenuQueries');

    it('should fetch categories successfully', async () => {
      const mockResponse = { data: mockCategories, total: mockCategories.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useMenuCategories(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/menu-category', undefined);
      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.data).toHaveLength(3);
    });

    it('should fetch categories with type filter', async () => {
      const kitchenCategories = mockCategories.filter((c) => c.type === MenuCategoryType.KITCHEN);
      const mockResponse = { data: kitchenCategories, total: kitchenCategories.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(
        () => useMenuCategories({ params: { type: MenuCategoryType.KITCHEN } }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/menu-category?type=Kitchen', undefined);
      expect(result.current.data?.data).toHaveLength(2);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useMenuCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useMenuCategory hook', () => {
    const { useMenuCategory } = require('../hooks/useMenuQueries');

    it('should fetch single category by ID', async () => {
      const mockCategory = mockCategories[0];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockCategory });

      const { result } = renderHook(() => useMenuCategory({ id: 'cat-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/menu-category/cat-1', undefined);
      expect(result.current.data).toEqual(mockCategory);
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useMenuCategory({ id: '' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });
  });

  describe('useMenuItems hook', () => {
    const { useMenuItems } = require('../hooks/useMenuQueries');

    it('should fetch items successfully', async () => {
      const mockResponse = { data: mockItems, total: mockItems.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useMenuItems(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/menu-item', undefined);
      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.data).toHaveLength(4);
    });

    it('should fetch active items only', async () => {
      const activeItems = mockItems.filter((i) => i.isActive);
      const mockResponse = { data: activeItems, total: activeItems.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useMenuItems({ params: { isActive: true } }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/menu-item?isActive=true', undefined);
      expect(result.current.data?.data).toHaveLength(3);
    });

    it('should fetch items by category', async () => {
      const categoryItems = mockItems.filter((i) => i.categoryId === 'cat-2');
      const mockResponse = { data: categoryItems, total: categoryItems.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useMenuItems({ params: { categoryId: 'cat-2' } }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/menu-item?categoryId=cat-2', undefined);
      expect(result.current.data?.data).toHaveLength(2);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Server error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useMenuItems(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useMenuItem hook', () => {
    const { useMenuItem } = require('../hooks/useMenuQueries');

    it('should fetch single item by ID', async () => {
      const mockItem = mockItems[0];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockItem });

      const { result } = renderHook(() => useMenuItem({ id: 'item-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/menu-item/item-1', undefined);
      expect(result.current.data).toEqual(mockItem);
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useMenuItem({ id: '' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });
  });

  describe('useExtras hook', () => {
    const { useExtras } = require('../hooks/useMenuQueries');

    it('should fetch extras successfully', async () => {
      const mockResponse = { data: mockExtras, total: mockExtras.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useExtras(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/extra', undefined);
      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.data).toHaveLength(3);
    });

    it('should fetch active extras only', async () => {
      const activeExtras = mockExtras.filter((e) => e.isActive);
      const mockResponse = { data: activeExtras, total: activeExtras.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useExtras({ params: { isActive: true } }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/extra?isActive=true', undefined);
      expect(result.current.data?.data).toHaveLength(2);
    });

    it('should handle fetch error', async () => {
      const error = new Error('API error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useExtras(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useExtra hook', () => {
    const { useExtra } = require('../hooks/useMenuQueries');

    it('should fetch single extra by ID', async () => {
      const mockExtra = mockExtras[0];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockExtra });

      const { result } = renderHook(() => useExtra({ id: 'extra-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/extra/extra-1', undefined);
      expect(result.current.data).toEqual(mockExtra);
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useExtra({ id: '' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });
  });

  describe('useMenuData hook', () => {
    const { useMenuData } = require('../hooks/useMenuQueries');

    it('should fetch all menu data (categories, items, extras)', async () => {
      const categoriesResponse = { data: mockCategories, total: mockCategories.length };
      const itemsResponse = { data: mockItems, total: mockItems.length };
      const extrasResponse = { data: mockExtras, total: mockExtras.length };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: categoriesResponse })
        .mockResolvedValueOnce({ data: itemsResponse })
        .mockResolvedValueOnce({ data: extrasResponse });

      const { result } = renderHook(() => useMenuData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.categories.isSuccess).toBe(true);
        expect(result.current.items.isSuccess).toBe(true);
        expect(result.current.extras.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.categories.data?.data).toHaveLength(3);
      expect(result.current.items.data?.data).toHaveLength(4);
      expect(result.current.extras.data?.data).toHaveLength(3);
    });

    it('should report combined error', async () => {
      const error = new Error('API error');
      mockAxiosInstance.get.mockRejectedValue(error);

      const { result } = renderHook(() => useMenuData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });

    it('should have refetchAll function', async () => {
      const categoriesResponse = { data: mockCategories, total: mockCategories.length };
      const itemsResponse = { data: mockItems, total: mockItems.length };
      const extrasResponse = { data: mockExtras, total: mockExtras.length };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: categoriesResponse })
        .mockResolvedValueOnce({ data: itemsResponse })
        .mockResolvedValueOnce({ data: extrasResponse })
        .mockResolvedValueOnce({ data: categoriesResponse })
        .mockResolvedValueOnce({ data: itemsResponse })
        .mockResolvedValueOnce({ data: extrasResponse });

      const { result } = renderHook(() => useMenuData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.categories.isSuccess).toBe(true);
        expect(result.current.items.isSuccess).toBe(true);
        expect(result.current.extras.isSuccess).toBe(true);
      });

      expect(typeof result.current.refetchAll).toBe('function');

      await result.current.refetchAll();

      // Should have been called 6 times total (3 initial + 3 refetch)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(6);
    });

    it('should sync data to menu store by default', async () => {
      const categoriesResponse = { data: mockCategories, total: mockCategories.length };
      const itemsResponse = { data: mockItems, total: mockItems.length };
      const extrasResponse = { data: mockExtras, total: mockExtras.length };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: categoriesResponse })
        .mockResolvedValueOnce({ data: itemsResponse })
        .mockResolvedValueOnce({ data: extrasResponse });

      const { result } = renderHook(() => useMenuData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.categories.isSuccess).toBe(true);
        expect(result.current.items.isSuccess).toBe(true);
        expect(result.current.extras.isSuccess).toBe(true);
      });

      expect(mockSetCategories).toHaveBeenCalledWith(mockCategories);
      expect(mockSetItems).toHaveBeenCalledWith(mockItems);
      expect(mockSetExtras).toHaveBeenCalledWith(mockExtras);
    });

    it('should not sync to store when syncToStore is false', async () => {
      const categoriesResponse = { data: mockCategories, total: mockCategories.length };
      const itemsResponse = { data: mockItems, total: mockItems.length };
      const extrasResponse = { data: mockExtras, total: mockExtras.length };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: categoriesResponse })
        .mockResolvedValueOnce({ data: itemsResponse })
        .mockResolvedValueOnce({ data: extrasResponse });

      const { result } = renderHook(() => useMenuData({ syncToStore: false }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.categories.isSuccess).toBe(true);
        expect(result.current.items.isSuccess).toBe(true);
        expect(result.current.extras.isSuccess).toBe(true);
      });

      expect(mockSetCategories).not.toHaveBeenCalled();
      expect(mockSetItems).not.toHaveBeenCalled();
      expect(mockSetExtras).not.toHaveBeenCalled();
    });
  });

  describe('useMenuItemsByCategory utility', () => {
    const { useMenuItemsByCategory } = require('../hooks/useMenuQueries');

    it('should filter items by category ID', () => {
      const { result } = renderHook(() => useMenuItemsByCategory(mockItems, 'cat-2'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(2);
      expect(result.current.every((item: MenuItem) => item.categoryId === 'cat-2')).toBe(true);
    });

    it('should return all items when categoryId is undefined', () => {
      const { result } = renderHook(() => useMenuItemsByCategory(mockItems, undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(4);
    });

    it('should return empty array when items is undefined', () => {
      const { result } = renderHook(() => useMenuItemsByCategory(undefined, 'cat-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual([]);
    });

    it('should return empty array when no items match category', () => {
      const { result } = renderHook(() => useMenuItemsByCategory(mockItems, 'non-existent-cat'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(0);
    });
  });

  describe('useMenuItemSearch utility', () => {
    const { useMenuItemSearch } = require('../hooks/useMenuQueries');

    it('should search items by English title', () => {
      const { result } = renderHook(() => useMenuItemSearch(mockItems, 'Caesar'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('item-1');
    });

    it('should search items by Russian title', () => {
      const { result } = renderHook(() => useMenuItemSearch(mockItems, 'Цезарь'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('item-1');
    });

    it('should search items by description', () => {
      const { result } = renderHook(() => useMenuItemSearch(mockItems, 'salmon'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('item-2');
    });

    it('should be case insensitive', () => {
      const { result } = renderHook(() => useMenuItemSearch(mockItems, 'PIZZA'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('item-3');
    });

    it('should return all items when query is empty', () => {
      const { result } = renderHook(() => useMenuItemSearch(mockItems, ''), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(4);
    });

    it('should return all items when query is undefined', () => {
      const { result } = renderHook(() => useMenuItemSearch(mockItems, undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(4);
    });

    it('should return empty array when items is undefined', () => {
      const { result } = renderHook(() => useMenuItemSearch(undefined, 'pizza'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual([]);
    });

    it('should return empty array when no items match', () => {
      const { result } = renderHook(() => useMenuItemSearch(mockItems, 'sushi'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(0);
    });
  });

  describe('useActiveMenuItems utility', () => {
    const { useActiveMenuItems } = require('../hooks/useMenuQueries');

    it('should return only active items', () => {
      const { result } = renderHook(() => useActiveMenuItems(mockItems), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(3);
      expect(result.current.every((item: MenuItem) => item.isActive)).toBe(true);
    });

    it('should return empty array when items is undefined', () => {
      const { result } = renderHook(() => useActiveMenuItems(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual([]);
    });
  });

  describe('useExtrasForItem utility', () => {
    const { useExtrasForItem } = require('../hooks/useMenuQueries');

    it('should return extras that match item extraIds', () => {
      const extraIds = ['extra-1', 'extra-2'];
      const { result } = renderHook(() => useExtrasForItem(mockExtras, extraIds), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(2);
      expect(result.current.map((e: Extra) => e.id)).toEqual(['extra-1', 'extra-2']);
    });

    it('should return empty array when extraIds is empty', () => {
      const { result } = renderHook(() => useExtrasForItem(mockExtras, []), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual([]);
    });

    it('should return empty array when extraIds is undefined', () => {
      const { result } = renderHook(() => useExtrasForItem(mockExtras, undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual([]);
    });

    it('should return empty array when extras is undefined', () => {
      const { result } = renderHook(() => useExtrasForItem(undefined, ['extra-1']), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual([]);
    });

    it('should filter out non-existent extras', () => {
      const extraIds = ['extra-1', 'non-existent'];
      const { result } = renderHook(() => useExtrasForItem(mockExtras, extraIds), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('extra-1');
    });
  });

  describe('useMenuCacheActions hook', () => {
    const { useMenuCacheActions, menuCategoryQueryKeys, menuItemQueryKeys, extraQueryKeys } =
      require('../hooks/useMenuQueries');

    it('should return cache action functions', () => {
      const { result } = renderHook(() => useMenuCacheActions(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.invalidateCategories).toBe('function');
      expect(typeof result.current.invalidateItems).toBe('function');
      expect(typeof result.current.invalidateExtras).toBe('function');
      expect(typeof result.current.invalidateAll).toBe('function');
      expect(typeof result.current.prefetchCategories).toBe('function');
      expect(typeof result.current.prefetchItems).toBe('function');
      expect(typeof result.current.prefetchExtras).toBe('function');
      expect(typeof result.current.prefetchAll).toBe('function');
    });

    it('invalidateCategories should invalidate category queries', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useMenuCacheActions(), {
        wrapper: createWrapper(),
      });

      result.current.invalidateCategories();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: menuCategoryQueryKeys.all,
      });
    });

    it('invalidateCategories with params should invalidate specific query', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useMenuCacheActions(), {
        wrapper: createWrapper(),
      });

      const params = { type: 'Kitchen' };
      result.current.invalidateCategories(params);

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: menuCategoryQueryKeys.list(params),
      });
    });

    it('invalidateItems should invalidate item queries', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useMenuCacheActions(), {
        wrapper: createWrapper(),
      });

      result.current.invalidateItems();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: menuItemQueryKeys.all,
      });
    });

    it('invalidateExtras should invalidate extra queries', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useMenuCacheActions(), {
        wrapper: createWrapper(),
      });

      result.current.invalidateExtras();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: extraQueryKeys.all,
      });
    });

    it('invalidateAll should invalidate all menu queries', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useMenuCacheActions(), {
        wrapper: createWrapper(),
      });

      result.current.invalidateAll();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: menuCategoryQueryKeys.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: menuItemQueryKeys.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: extraQueryKeys.all,
      });
    });

    it('prefetchCategories should prefetch category data', async () => {
      const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');
      const mockResponse = { data: mockCategories, total: mockCategories.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useMenuCacheActions(), {
        wrapper: createWrapper(),
      });

      await result.current.prefetchCategories();

      expect(prefetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: menuCategoryQueryKeys.list(undefined),
        })
      );
    });

    it('prefetchItems should prefetch item data', async () => {
      const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');
      const mockResponse = { data: mockItems, total: mockItems.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useMenuCacheActions(), {
        wrapper: createWrapper(),
      });

      await result.current.prefetchItems();

      expect(prefetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: menuItemQueryKeys.list(undefined),
        })
      );
    });

    it('prefetchExtras should prefetch extra data', async () => {
      const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');
      const mockResponse = { data: mockExtras, total: mockExtras.length };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useMenuCacheActions(), {
        wrapper: createWrapper(),
      });

      await result.current.prefetchExtras();

      expect(prefetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: extraQueryKeys.list(undefined),
        })
      );
    });

    it('prefetchAll should prefetch all menu data', async () => {
      const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');
      const categoriesResponse = { data: mockCategories, total: mockCategories.length };
      const itemsResponse = { data: mockItems, total: mockItems.length };
      const extrasResponse = { data: mockExtras, total: mockExtras.length };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: categoriesResponse })
        .mockResolvedValueOnce({ data: itemsResponse })
        .mockResolvedValueOnce({ data: extrasResponse });

      const { result } = renderHook(() => useMenuCacheActions(), {
        wrapper: createWrapper(),
      });

      await result.current.prefetchAll();

      expect(prefetchSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Hook Exports', () => {
    it('should export all hooks from useMenuQueries', () => {
      const exports = require('../hooks/useMenuQueries');

      expect(exports.menuCategoryQueryKeys).toBeDefined();
      expect(exports.menuItemQueryKeys).toBeDefined();
      expect(exports.extraQueryKeys).toBeDefined();
      expect(exports.useMenuCategories).toBeDefined();
      expect(exports.useMenuCategory).toBeDefined();
      expect(exports.useMenuItems).toBeDefined();
      expect(exports.useMenuItem).toBeDefined();
      expect(exports.useExtras).toBeDefined();
      expect(exports.useExtra).toBeDefined();
      expect(exports.useMenuData).toBeDefined();
      expect(exports.useMenuItemsByCategory).toBeDefined();
      expect(exports.useMenuItemSearch).toBeDefined();
      expect(exports.useActiveMenuItems).toBeDefined();
      expect(exports.useExtrasForItem).toBeDefined();
      expect(exports.useMenuCacheActions).toBeDefined();
    });

    it('should export all hooks from hooks index', () => {
      const hooksIndex = require('../hooks/index');

      expect(hooksIndex.menuCategoryQueryKeys).toBeDefined();
      expect(hooksIndex.menuItemQueryKeys).toBeDefined();
      expect(hooksIndex.extraQueryKeys).toBeDefined();
      expect(hooksIndex.useMenuCategories).toBeDefined();
      expect(hooksIndex.useMenuCategory).toBeDefined();
      expect(hooksIndex.useMenuItems).toBeDefined();
      expect(hooksIndex.useMenuItem).toBeDefined();
      expect(hooksIndex.useExtras).toBeDefined();
      expect(hooksIndex.useExtra).toBeDefined();
      expect(hooksIndex.useMenuData).toBeDefined();
      expect(hooksIndex.useMenuItemsByCategory).toBeDefined();
      expect(hooksIndex.useMenuItemSearch).toBeDefined();
      expect(hooksIndex.useActiveMenuItems).toBeDefined();
      expect(hooksIndex.useExtrasForItem).toBeDefined();
      expect(hooksIndex.useMenuCacheActions).toBeDefined();
    });
  });
});
