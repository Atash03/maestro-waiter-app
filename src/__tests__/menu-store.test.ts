/**
 * Tests for the Menu Store
 */

import { MenuCategoryType } from '../types/enums';
import type { Extra, MenuCategory, MenuItem, Translation } from '../types/models';

// Mock the API modules
const mockGetMenuCategories = jest.fn();
const mockGetMenuItems = jest.fn();
const mockGetExtras = jest.fn();

jest.mock('../services/api/menu', () => ({
  getMenuCategories: () => mockGetMenuCategories(),
  getMenuItems: () => mockGetMenuItems(),
}));

jest.mock('../services/api/extras', () => ({
  getExtras: () => mockGetExtras(),
}));

// Mock AsyncStorage
const mockAsyncStorageGetItem = jest.fn();
const mockAsyncStorageSetItem = jest.fn();
const mockAsyncStorageRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockAsyncStorageGetItem(key),
    setItem: (key: string, value: string) => mockAsyncStorageSetItem(key, value),
    removeItem: (key: string) => mockAsyncStorageRemoveItem(key),
  },
}));

// Import the store after mocking
import {
  getTranslatedText,
  useExtras,
  useFilteredItems,
  useItemsByCategory,
  useMenuCategories,
  useMenuError,
  useMenuItems,
  useMenuLoading,
  useMenuStore,
  useRecentItemIds,
  useRecentItems,
  useSearchQuery,
  useSelectedCategory,
  useSelectedCategoryId,
} from '../stores/menuStore';

// Test data
const testCategories: MenuCategory[] = [
  {
    id: 'cat-1',
    title: { en: 'Appetizers', ru: 'Закуски', tm: 'Appetizer' },
    type: MenuCategoryType.KITCHEN,
    imagePath: '/images/appetizers.jpg',
    parentId: null,
    children: [
      {
        id: 'cat-1-1',
        title: { en: 'Cold Appetizers', ru: 'Холодные закуски', tm: 'Sowuk appetizer' },
        type: MenuCategoryType.KITCHEN,
        imagePath: null,
        parentId: 'cat-1',
      },
    ],
  },
  {
    id: 'cat-2',
    title: { en: 'Drinks', ru: 'Напитки', tm: 'Ichgiler' },
    type: MenuCategoryType.BAR,
    imagePath: '/images/drinks.jpg',
    parentId: null,
  },
  {
    id: 'cat-3',
    title: { en: 'Main Courses', ru: 'Основные блюда', tm: 'Esasy tagamlar' },
    type: MenuCategoryType.KITCHEN,
    imagePath: '/images/main.jpg',
    parentId: null,
  },
];

const testItems: MenuItem[] = [
  {
    id: 'item-1',
    title: { en: 'Caesar Salad', ru: 'Салат Цезарь', tm: 'Caesar salat' },
    description: {
      en: 'Fresh salad with chicken',
      ru: 'Свежий салат с курицей',
      tm: 'Towuk bilen taze salat',
    },
    price: '12.99',
    categoryId: 'cat-1',
    imagePath: '/images/caesar.jpg',
    isActive: true,
    isGroup: false,
  },
  {
    id: 'item-2',
    title: { en: 'Cola', ru: 'Кола', tm: 'Kola' },
    description: {
      en: 'Refreshing cola drink',
      ru: 'Освежающий напиток кола',
      tm: 'Serinlediji kola',
    },
    price: '3.50',
    categoryId: 'cat-2',
    imagePath: '/images/cola.jpg',
    isActive: true,
    isGroup: false,
  },
  {
    id: 'item-3',
    title: { en: 'Grilled Steak', ru: 'Стейк на гриле', tm: 'Grillde steak' },
    description: {
      en: 'Premium beef steak',
      ru: 'Премиум говяжий стейк',
      tm: 'Premium sygyr steaky',
    },
    price: '29.99',
    categoryId: 'cat-3',
    imagePath: '/images/steak.jpg',
    isActive: true,
    isGroup: false,
  },
  {
    id: 'item-4',
    title: { en: 'Spring Rolls', ru: 'Спринг роллы', tm: 'Spring rollary' },
    description: {
      en: 'Crispy vegetable rolls',
      ru: 'Хрустящие овощные роллы',
      tm: 'Gowurgaly gok-onumli rollary',
    },
    price: '8.99',
    categoryId: 'cat-1',
    imagePath: '/images/spring-rolls.jpg',
    isActive: true,
    isGroup: false,
  },
];

const testExtras: Extra[] = [
  {
    id: 'extra-1',
    title: { en: 'Extra Cheese', ru: 'Дополнительный сыр', tm: 'Goşmaça peýnir' },
    description: { en: 'Add extra cheese', ru: 'Добавить сыр', tm: 'Goşmaça peýnir goş' },
    actualPrice: '2.00',
    isActive: true,
  },
  {
    id: 'extra-2',
    title: { en: 'Bacon', ru: 'Бекон', tm: 'Bekon' },
    description: { en: 'Add bacon strips', ru: 'Добавить бекон', tm: 'Bekon goş' },
    actualPrice: '3.50',
    isActive: true,
  },
];

describe('MenuStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorageGetItem.mockResolvedValue(null);
    mockAsyncStorageSetItem.mockResolvedValue(undefined);
    mockAsyncStorageRemoveItem.mockResolvedValue(undefined);

    // Reset store state before each test
    useMenuStore.setState({
      categories: [],
      items: [],
      extras: [],
      selectedCategoryId: null,
      searchQuery: '',
      recentItemIds: [],
      isLoadingCategories: false,
      isLoadingItems: false,
      isLoadingExtras: false,
      error: null,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useMenuStore.getState();

      expect(state.categories).toEqual([]);
      expect(state.items).toEqual([]);
      expect(state.extras).toEqual([]);
      expect(state.selectedCategoryId).toBeNull();
      expect(state.searchQuery).toBe('');
      expect(state.recentItemIds).toEqual([]);
      expect(state.isLoadingCategories).toBe(false);
      expect(state.isLoadingItems).toBe(false);
      expect(state.isLoadingExtras).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchCategories', () => {
    it('should fetch categories successfully', async () => {
      mockGetMenuCategories.mockResolvedValueOnce({ data: testCategories });

      const { fetchCategories } = useMenuStore.getState();
      await fetchCategories();

      const state = useMenuStore.getState();
      expect(state.categories).toEqual(testCategories);
      expect(state.isLoadingCategories).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isLoadingCategories while fetching', async () => {
      let resolveFetch: ((value: { data: MenuCategory[] }) => void) | undefined;
      mockGetMenuCategories.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { fetchCategories } = useMenuStore.getState();
      const fetchPromise = fetchCategories();

      expect(useMenuStore.getState().isLoadingCategories).toBe(true);

      resolveFetch?.({ data: testCategories });
      await fetchPromise;

      expect(useMenuStore.getState().isLoadingCategories).toBe(false);
    });

    it('should handle fetch categories error', async () => {
      mockGetMenuCategories.mockRejectedValueOnce(new Error('Network error'));

      const { fetchCategories } = useMenuStore.getState();

      await expect(fetchCategories()).rejects.toThrow('Network error');

      const state = useMenuStore.getState();
      expect(state.categories).toEqual([]);
      expect(state.isLoadingCategories).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should clear previous error on new fetch', async () => {
      useMenuStore.setState({ error: 'Previous error' });
      mockGetMenuCategories.mockResolvedValueOnce({ data: testCategories });

      const { fetchCategories } = useMenuStore.getState();
      await fetchCategories();

      expect(useMenuStore.getState().error).toBeNull();
    });
  });

  describe('fetchItems', () => {
    it('should fetch items successfully', async () => {
      mockGetMenuItems.mockResolvedValueOnce({ data: testItems });

      const { fetchItems } = useMenuStore.getState();
      await fetchItems();

      const state = useMenuStore.getState();
      expect(state.items).toEqual(testItems);
      expect(state.isLoadingItems).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isLoadingItems while fetching', async () => {
      let resolveFetch: ((value: { data: MenuItem[] }) => void) | undefined;
      mockGetMenuItems.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { fetchItems } = useMenuStore.getState();
      const fetchPromise = fetchItems();

      expect(useMenuStore.getState().isLoadingItems).toBe(true);

      resolveFetch?.({ data: testItems });
      await fetchPromise;

      expect(useMenuStore.getState().isLoadingItems).toBe(false);
    });

    it('should handle fetch items error', async () => {
      mockGetMenuItems.mockRejectedValueOnce(new Error('Server error'));

      const { fetchItems } = useMenuStore.getState();

      await expect(fetchItems()).rejects.toThrow('Server error');

      const state = useMenuStore.getState();
      expect(state.items).toEqual([]);
      expect(state.isLoadingItems).toBe(false);
      expect(state.error).toBe('Server error');
    });
  });

  describe('fetchExtras', () => {
    it('should fetch extras successfully', async () => {
      mockGetExtras.mockResolvedValueOnce({ data: testExtras });

      const { fetchExtras } = useMenuStore.getState();
      await fetchExtras();

      const state = useMenuStore.getState();
      expect(state.extras).toEqual(testExtras);
      expect(state.isLoadingExtras).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isLoadingExtras while fetching', async () => {
      let resolveFetch: ((value: { data: Extra[] }) => void) | undefined;
      mockGetExtras.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { fetchExtras } = useMenuStore.getState();
      const fetchPromise = fetchExtras();

      expect(useMenuStore.getState().isLoadingExtras).toBe(true);

      resolveFetch?.({ data: testExtras });
      await fetchPromise;

      expect(useMenuStore.getState().isLoadingExtras).toBe(false);
    });

    it('should handle fetch extras error', async () => {
      mockGetExtras.mockRejectedValueOnce(new Error('Extras error'));

      const { fetchExtras } = useMenuStore.getState();

      await expect(fetchExtras()).rejects.toThrow('Extras error');

      const state = useMenuStore.getState();
      expect(state.extras).toEqual([]);
      expect(state.isLoadingExtras).toBe(false);
      expect(state.error).toBe('Extras error');
    });
  });

  describe('fetchAll', () => {
    it('should fetch categories, items, and extras', async () => {
      mockGetMenuCategories.mockResolvedValueOnce({ data: testCategories });
      mockGetMenuItems.mockResolvedValueOnce({ data: testItems });
      mockGetExtras.mockResolvedValueOnce({ data: testExtras });

      const { fetchAll } = useMenuStore.getState();
      await fetchAll();

      const state = useMenuStore.getState();
      expect(state.categories).toEqual(testCategories);
      expect(state.items).toEqual(testItems);
      expect(state.extras).toEqual(testExtras);
    });

    it('should fetch all data in parallel', async () => {
      const fetchOrder: string[] = [];

      mockGetMenuCategories.mockImplementation(async () => {
        fetchOrder.push('categories-start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        fetchOrder.push('categories-end');
        return { data: testCategories };
      });

      mockGetMenuItems.mockImplementation(async () => {
        fetchOrder.push('items-start');
        await new Promise((resolve) => setTimeout(resolve, 5));
        fetchOrder.push('items-end');
        return { data: testItems };
      });

      mockGetExtras.mockImplementation(async () => {
        fetchOrder.push('extras-start');
        await new Promise((resolve) => setTimeout(resolve, 3));
        fetchOrder.push('extras-end');
        return { data: testExtras };
      });

      const { fetchAll } = useMenuStore.getState();
      await fetchAll();

      // All should start before any finishes
      expect(fetchOrder.indexOf('categories-start')).toBeLessThan(
        fetchOrder.indexOf('categories-end')
      );
      expect(fetchOrder.indexOf('items-start')).toBeLessThan(fetchOrder.indexOf('items-end'));
      expect(fetchOrder.indexOf('extras-start')).toBeLessThan(fetchOrder.indexOf('extras-end'));
    });
  });

  describe('selectCategory', () => {
    it('should select a category by ID', () => {
      const { selectCategory } = useMenuStore.getState();
      selectCategory('cat-1');

      expect(useMenuStore.getState().selectedCategoryId).toBe('cat-1');
    });

    it('should clear selection when null is passed', () => {
      useMenuStore.setState({ selectedCategoryId: 'cat-1' });

      const { selectCategory } = useMenuStore.getState();
      selectCategory(null);

      expect(useMenuStore.getState().selectedCategoryId).toBeNull();
    });
  });

  describe('setSearchQuery', () => {
    it('should set the search query', () => {
      const { setSearchQuery } = useMenuStore.getState();
      setSearchQuery('salad');

      expect(useMenuStore.getState().searchQuery).toBe('salad');
    });

    it('should allow empty query', () => {
      useMenuStore.setState({ searchQuery: 'previous' });

      const { setSearchQuery } = useMenuStore.getState();
      setSearchQuery('');

      expect(useMenuStore.getState().searchQuery).toBe('');
    });
  });

  describe('getCategoryById', () => {
    beforeEach(() => {
      useMenuStore.setState({ categories: testCategories });
    });

    it('should return top-level category by ID', () => {
      const { getCategoryById } = useMenuStore.getState();
      const category = getCategoryById('cat-1');

      expect(category).toEqual(testCategories[0]);
    });

    it('should return nested category by ID', () => {
      const { getCategoryById } = useMenuStore.getState();
      const category = getCategoryById('cat-1-1');

      expect(category).toEqual(testCategories[0].children?.[0]);
    });

    it('should return undefined for non-existent category', () => {
      const { getCategoryById } = useMenuStore.getState();
      const category = getCategoryById('non-existent');

      expect(category).toBeUndefined();
    });
  });

  describe('getItemById', () => {
    beforeEach(() => {
      useMenuStore.setState({ items: testItems });
    });

    it('should return item by ID', () => {
      const { getItemById } = useMenuStore.getState();
      const item = getItemById('item-1');

      expect(item).toEqual(testItems[0]);
    });

    it('should return undefined for non-existent item', () => {
      const { getItemById } = useMenuStore.getState();
      const item = getItemById('non-existent');

      expect(item).toBeUndefined();
    });
  });

  describe('getExtraById', () => {
    beforeEach(() => {
      useMenuStore.setState({ extras: testExtras });
    });

    it('should return extra by ID', () => {
      const { getExtraById } = useMenuStore.getState();
      const extra = getExtraById('extra-1');

      expect(extra).toEqual(testExtras[0]);
    });

    it('should return undefined for non-existent extra', () => {
      const { getExtraById } = useMenuStore.getState();
      const extra = getExtraById('non-existent');

      expect(extra).toBeUndefined();
    });
  });

  describe('getItemsByCategory', () => {
    beforeEach(() => {
      useMenuStore.setState({ items: testItems });
    });

    it('should return items for a specific category', () => {
      const { getItemsByCategory } = useMenuStore.getState();
      const items = getItemsByCategory('cat-1');

      expect(items).toHaveLength(2);
      expect(items.map((i) => i.id)).toEqual(['item-1', 'item-4']);
    });

    it('should return empty array for category with no items', () => {
      const { getItemsByCategory } = useMenuStore.getState();
      const items = getItemsByCategory('cat-empty');

      expect(items).toEqual([]);
    });
  });

  describe('getFilteredItems', () => {
    beforeEach(() => {
      useMenuStore.setState({ items: testItems });
    });

    it('should return all items when no filters are applied', () => {
      const { getFilteredItems } = useMenuStore.getState();
      const items = getFilteredItems();

      expect(items).toEqual(testItems);
    });

    it('should filter items by category', () => {
      useMenuStore.setState({ selectedCategoryId: 'cat-1' });

      const { getFilteredItems } = useMenuStore.getState();
      const items = getFilteredItems();

      expect(items).toHaveLength(2);
      expect(items.map((i) => i.id)).toEqual(['item-1', 'item-4']);
    });

    it('should filter items by search query (English)', () => {
      useMenuStore.setState({ searchQuery: 'salad' });

      const { getFilteredItems } = useMenuStore.getState();
      const items = getFilteredItems();

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-1');
    });

    it('should filter items by search query (Russian)', () => {
      useMenuStore.setState({ searchQuery: 'Цезарь' });

      const { getFilteredItems } = useMenuStore.getState();
      const items = getFilteredItems();

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-1');
    });

    it('should filter items by both category and search query', () => {
      useMenuStore.setState({
        selectedCategoryId: 'cat-1',
        searchQuery: 'rolls',
      });

      const { getFilteredItems } = useMenuStore.getState();
      const items = getFilteredItems();

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-4');
    });

    it('should return empty array when no items match', () => {
      useMenuStore.setState({ searchQuery: 'xyz123' });

      const { getFilteredItems } = useMenuStore.getState();
      const items = getFilteredItems();

      expect(items).toEqual([]);
    });

    it('should search in description as well', () => {
      useMenuStore.setState({ searchQuery: 'premium' });

      const { getFilteredItems } = useMenuStore.getState();
      const items = getFilteredItems();

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-3');
    });
  });

  describe('searchItems', () => {
    beforeEach(() => {
      useMenuStore.setState({ items: testItems });
    });

    it('should return all items when query is empty', () => {
      const { searchItems } = useMenuStore.getState();
      const items = searchItems('');

      expect(items).toEqual(testItems);
    });

    it('should return all items when query is whitespace', () => {
      const { searchItems } = useMenuStore.getState();
      const items = searchItems('   ');

      expect(items).toEqual(testItems);
    });

    it('should search items by title', () => {
      const { searchItems } = useMenuStore.getState();
      const items = searchItems('cola');

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-2');
    });

    it('should search items by description', () => {
      const { searchItems } = useMenuStore.getState();
      const items = searchItems('beef');

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-3');
    });

    it('should be case insensitive', () => {
      const { searchItems } = useMenuStore.getState();
      const items = searchItems('CAESAR');

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-1');
    });
  });

  describe('Recently Used Items', () => {
    beforeEach(() => {
      useMenuStore.setState({ items: testItems });
    });

    describe('addToRecentItems', () => {
      it('should add item to recent items', () => {
        const { addToRecentItems } = useMenuStore.getState();
        addToRecentItems('item-1');

        expect(useMenuStore.getState().recentItemIds).toEqual(['item-1']);
      });

      it('should add item to front of list', () => {
        useMenuStore.setState({ recentItemIds: ['item-1'] });

        const { addToRecentItems } = useMenuStore.getState();
        addToRecentItems('item-2');

        expect(useMenuStore.getState().recentItemIds).toEqual(['item-2', 'item-1']);
      });

      it('should move existing item to front', () => {
        useMenuStore.setState({ recentItemIds: ['item-1', 'item-2', 'item-3'] });

        const { addToRecentItems } = useMenuStore.getState();
        addToRecentItems('item-2');

        expect(useMenuStore.getState().recentItemIds).toEqual(['item-2', 'item-1', 'item-3']);
      });

      it('should limit to max items', () => {
        // Create 25 item IDs
        const manyIds = Array.from({ length: 25 }, (_, i) => `id-${i}`);
        useMenuStore.setState({ recentItemIds: manyIds });

        const { addToRecentItems } = useMenuStore.getState();
        addToRecentItems('new-item');

        const recentIds = useMenuStore.getState().recentItemIds;
        expect(recentIds).toHaveLength(20);
        expect(recentIds[0]).toBe('new-item');
      });

      it('should persist to AsyncStorage', async () => {
        const { addToRecentItems } = useMenuStore.getState();
        addToRecentItems('item-1');

        // Wait for async storage operation
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
          '@maestro_recent_menu_items',
          JSON.stringify(['item-1'])
        );
      });
    });

    describe('getRecentItems', () => {
      it('should return recent items as MenuItem objects', () => {
        useMenuStore.setState({ recentItemIds: ['item-1', 'item-2'] });

        const { getRecentItems } = useMenuStore.getState();
        const items = getRecentItems();

        expect(items).toHaveLength(2);
        expect(items[0].id).toBe('item-1');
        expect(items[1].id).toBe('item-2');
      });

      it('should filter out non-existent items', () => {
        useMenuStore.setState({ recentItemIds: ['item-1', 'non-existent', 'item-2'] });

        const { getRecentItems } = useMenuStore.getState();
        const items = getRecentItems();

        expect(items).toHaveLength(2);
        expect(items.map((i) => i.id)).toEqual(['item-1', 'item-2']);
      });

      it('should return empty array when no recent items', () => {
        const { getRecentItems } = useMenuStore.getState();
        const items = getRecentItems();

        expect(items).toEqual([]);
      });
    });

    describe('clearRecentItems', () => {
      it('should clear recent items', () => {
        useMenuStore.setState({ recentItemIds: ['item-1', 'item-2'] });

        const { clearRecentItems } = useMenuStore.getState();
        clearRecentItems();

        expect(useMenuStore.getState().recentItemIds).toEqual([]);
      });

      it('should remove from AsyncStorage', async () => {
        const { clearRecentItems } = useMenuStore.getState();
        clearRecentItems();

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockAsyncStorageRemoveItem).toHaveBeenCalledWith('@maestro_recent_menu_items');
      });
    });

    describe('loadRecentItems', () => {
      it('should load recent items from AsyncStorage', async () => {
        mockAsyncStorageGetItem.mockResolvedValueOnce(JSON.stringify(['item-1', 'item-2']));

        const { loadRecentItems } = useMenuStore.getState();
        await loadRecentItems();

        expect(useMenuStore.getState().recentItemIds).toEqual(['item-1', 'item-2']);
      });

      it('should handle null from AsyncStorage', async () => {
        mockAsyncStorageGetItem.mockResolvedValueOnce(null);

        const { loadRecentItems } = useMenuStore.getState();
        await loadRecentItems();

        expect(useMenuStore.getState().recentItemIds).toEqual([]);
      });

      it('should handle invalid JSON from AsyncStorage', async () => {
        mockAsyncStorageGetItem.mockResolvedValueOnce('invalid-json');

        const { loadRecentItems } = useMenuStore.getState();
        await loadRecentItems();

        // Should not throw and keep current state
        expect(useMenuStore.getState().recentItemIds).toEqual([]);
      });

      it('should handle non-array from AsyncStorage', async () => {
        mockAsyncStorageGetItem.mockResolvedValueOnce(JSON.stringify('not-an-array'));

        const { loadRecentItems } = useMenuStore.getState();
        await loadRecentItems();

        expect(useMenuStore.getState().recentItemIds).toEqual([]);
      });
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      useMenuStore.setState({ error: 'Some error' });

      const { clearError } = useMenuStore.getState();
      clearError();

      expect(useMenuStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      useMenuStore.setState({
        categories: testCategories,
        items: testItems,
        extras: testExtras,
        selectedCategoryId: 'cat-1',
        searchQuery: 'test',
        recentItemIds: ['item-1'],
        isLoadingCategories: true,
        isLoadingItems: true,
        isLoadingExtras: true,
        error: 'Some error',
      });

      const { reset } = useMenuStore.getState();
      reset();

      const state = useMenuStore.getState();
      expect(state.categories).toEqual([]);
      expect(state.items).toEqual([]);
      expect(state.extras).toEqual([]);
      expect(state.selectedCategoryId).toBeNull();
      expect(state.searchQuery).toBe('');
      expect(state.recentItemIds).toEqual([]);
      expect(state.isLoadingCategories).toBe(false);
      expect(state.isLoadingItems).toBe(false);
      expect(state.isLoadingExtras).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});

describe('getTranslatedText helper', () => {
  it('should return English text by default', () => {
    const translation: Translation = { en: 'Hello', ru: 'Привет', tm: 'Salam' };
    expect(getTranslatedText(translation)).toBe('Hello');
  });

  it('should return fallback when translation is undefined', () => {
    expect(getTranslatedText(undefined, 'Default')).toBe('Default');
  });

  it('should return empty string when translation is undefined and no fallback', () => {
    expect(getTranslatedText(undefined)).toBe('');
  });

  it('should return Russian text when preferredLang is ru', () => {
    const translation: Translation = { en: 'Hello', ru: 'Привет', tm: 'Salam' };
    expect(getTranslatedText(translation, '', 'ru')).toBe('Привет');
  });

  it('should return Turkmen text when preferredLang is tm', () => {
    const translation: Translation = { en: 'Hello', ru: 'Привет', tm: 'Salam' };
    expect(getTranslatedText(translation, '', 'tm')).toBe('Salam');
  });

  it('should fall back to English when preferred language is empty', () => {
    const translation: Translation = { en: 'Hello', ru: '', tm: '' };
    expect(getTranslatedText(translation, '', 'ru')).toBe('Hello');
  });

  it('should fall back to Russian when English is empty', () => {
    const translation: Translation = { en: '', ru: 'Привет', tm: '' };
    expect(getTranslatedText(translation)).toBe('Привет');
  });

  it('should fall back to Turkmen when English and Russian are empty', () => {
    const translation: Translation = { en: '', ru: '', tm: 'Salam' };
    expect(getTranslatedText(translation)).toBe('Salam');
  });

  it('should return fallback when all languages are empty', () => {
    const translation: Translation = { en: '', ru: '', tm: '' };
    expect(getTranslatedText(translation, 'Fallback')).toBe('Fallback');
  });
});

describe('Menu Store Hooks', () => {
  beforeEach(() => {
    useMenuStore.setState({
      categories: testCategories,
      items: testItems,
      extras: testExtras,
      selectedCategoryId: 'cat-1',
      searchQuery: 'test',
      recentItemIds: ['item-1'],
      isLoadingCategories: true,
      isLoadingItems: false,
      isLoadingExtras: false,
      error: 'Test error',
    });
  });

  describe('useMenuCategories', () => {
    it('should be a defined function', () => {
      expect(useMenuCategories).toBeDefined();
      expect(typeof useMenuCategories).toBe('function');
    });
  });

  describe('useMenuItems', () => {
    it('should be a defined function', () => {
      expect(useMenuItems).toBeDefined();
      expect(typeof useMenuItems).toBe('function');
    });
  });

  describe('useExtras', () => {
    it('should be a defined function', () => {
      expect(useExtras).toBeDefined();
      expect(typeof useExtras).toBe('function');
    });
  });

  describe('useSelectedCategory', () => {
    it('should be a defined function', () => {
      expect(useSelectedCategory).toBeDefined();
      expect(typeof useSelectedCategory).toBe('function');
    });
  });

  describe('useSearchQuery', () => {
    it('should be a defined function', () => {
      expect(useSearchQuery).toBeDefined();
      expect(typeof useSearchQuery).toBe('function');
    });
  });

  describe('useFilteredItems', () => {
    it('should be a defined function', () => {
      expect(useFilteredItems).toBeDefined();
      expect(typeof useFilteredItems).toBe('function');
    });
  });

  describe('useItemsByCategory', () => {
    it('should be a defined function', () => {
      expect(useItemsByCategory).toBeDefined();
      expect(typeof useItemsByCategory).toBe('function');
    });
  });

  describe('useRecentItems', () => {
    it('should be a defined function', () => {
      expect(useRecentItems).toBeDefined();
      expect(typeof useRecentItems).toBe('function');
    });
  });

  describe('useMenuLoading', () => {
    it('should be a defined function', () => {
      expect(useMenuLoading).toBeDefined();
      expect(typeof useMenuLoading).toBe('function');
    });
  });

  describe('useMenuError', () => {
    it('should be a defined function', () => {
      expect(useMenuError).toBeDefined();
      expect(typeof useMenuError).toBe('function');
    });
  });

  describe('useSelectedCategoryId', () => {
    it('should be a defined function', () => {
      expect(useSelectedCategoryId).toBeDefined();
      expect(typeof useSelectedCategoryId).toBe('function');
    });
  });

  describe('useRecentItemIds', () => {
    it('should be a defined function', () => {
      expect(useRecentItemIds).toBeDefined();
      expect(typeof useRecentItemIds).toBe('function');
    });
  });
});

describe('MenuState type export', () => {
  it('should export MenuState type with correct properties', () => {
    const state = useMenuStore.getState();

    // State properties
    expect(state).toHaveProperty('categories');
    expect(state).toHaveProperty('items');
    expect(state).toHaveProperty('extras');
    expect(state).toHaveProperty('selectedCategoryId');
    expect(state).toHaveProperty('searchQuery');
    expect(state).toHaveProperty('recentItemIds');
    expect(state).toHaveProperty('isLoadingCategories');
    expect(state).toHaveProperty('isLoadingItems');
    expect(state).toHaveProperty('isLoadingExtras');
    expect(state).toHaveProperty('error');

    // Action methods
    expect(state).toHaveProperty('fetchCategories');
    expect(state).toHaveProperty('fetchItems');
    expect(state).toHaveProperty('fetchExtras');
    expect(state).toHaveProperty('fetchAll');
    expect(state).toHaveProperty('selectCategory');
    expect(state).toHaveProperty('setSearchQuery');
    expect(state).toHaveProperty('getCategoryById');
    expect(state).toHaveProperty('getItemById');
    expect(state).toHaveProperty('getExtraById');
    expect(state).toHaveProperty('getItemsByCategory');
    expect(state).toHaveProperty('getFilteredItems');
    expect(state).toHaveProperty('searchItems');
    expect(state).toHaveProperty('addToRecentItems');
    expect(state).toHaveProperty('getRecentItems');
    expect(state).toHaveProperty('clearRecentItems');
    expect(state).toHaveProperty('loadRecentItems');
    expect(state).toHaveProperty('clearError');
    expect(state).toHaveProperty('reset');
  });
});

describe('Store Index Export', () => {
  it('should export all menu store functions from index', async () => {
    const storeIndex = await import('../stores/index');

    expect(storeIndex.useMenuStore).toBeDefined();
    expect(storeIndex.useMenuCategories).toBeDefined();
    expect(storeIndex.useMenuItems).toBeDefined();
    expect(storeIndex.useExtras).toBeDefined();
    expect(storeIndex.useSelectedCategory).toBeDefined();
    expect(storeIndex.useSearchQuery).toBeDefined();
    expect(storeIndex.useFilteredItems).toBeDefined();
    expect(storeIndex.useItemsByCategory).toBeDefined();
    expect(storeIndex.useRecentItems).toBeDefined();
    expect(storeIndex.useMenuLoading).toBeDefined();
    expect(storeIndex.useMenuError).toBeDefined();
    expect(storeIndex.useSelectedCategoryId).toBeDefined();
    expect(storeIndex.useRecentItemIds).toBeDefined();
    expect(storeIndex.getTranslatedText).toBeDefined();
  });
});
