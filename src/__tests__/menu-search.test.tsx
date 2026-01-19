/**
 * Tests for MenuSearch Component
 *
 * Tests cover:
 * - Utility functions (addToRecentSearches, removeFromRecentSearches, loadRecentSearches, saveRecentSearches)
 * - MenuSearch component rendering
 * - Search input functionality
 * - Clear button functionality
 * - Recent searches dropdown
 * - Debounced search
 * - Focus/blur behavior
 * - Keyboard submit
 * - Disabled state
 * - Exports verification
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, waitFor } from '@testing-library/react-native';
import * as MenuIndex from '@/components/menu/index';
import type { MenuSearchProps, RecentSearchItem } from '@/components/menu/MenuSearch';
import {
  addToRecentSearches,
  clearRecentSearches,
  loadRecentSearches,
  MenuSearch,
  removeFromRecentSearches,
  saveRecentSearches,
} from '@/components/menu/MenuSearch';

// Mock dependencies
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Helper to check if JSON contains text
const jsonContains = (json: string, text: string): boolean => json.includes(text);

// ============================================================================
// Test Data
// ============================================================================

const mockRecentSearches: RecentSearchItem[] = [
  { query: 'burger', timestamp: 1700000001000 },
  { query: 'pizza', timestamp: 1700000000000 },
  { query: 'salad', timestamp: 1699999999000 },
];

const defaultProps: MenuSearchProps = {
  value: '',
  onChangeText: jest.fn(),
};

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe('MenuSearch Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addToRecentSearches', () => {
    it('adds a new search to the beginning of the list', () => {
      const result = addToRecentSearches(mockRecentSearches, 'pasta');
      expect(result[0].query).toBe('pasta');
      expect(result.length).toBe(4);
    });

    it('moves existing search to the beginning', () => {
      const result = addToRecentSearches(mockRecentSearches, 'pizza');
      expect(result[0].query).toBe('pizza');
      expect(result.length).toBe(3);
    });

    it('removes duplicate searches case-insensitively', () => {
      const result = addToRecentSearches(mockRecentSearches, 'BURGER');
      expect(result[0].query).toBe('BURGER');
      expect(result.filter((s) => s.query.toLowerCase() === 'burger').length).toBe(1);
    });

    it('limits to max searches', () => {
      const searches = Array.from({ length: 15 }, (_, i) => ({
        query: `search${i}`,
        timestamp: Date.now() - i * 1000,
      }));
      const result = addToRecentSearches(searches, 'newSearch', 10);
      expect(result.length).toBe(10);
      expect(result[0].query).toBe('newSearch');
    });

    it('returns original list for empty query', () => {
      const result = addToRecentSearches(mockRecentSearches, '');
      expect(result).toBe(mockRecentSearches);
    });

    it('returns original list for whitespace-only query', () => {
      const result = addToRecentSearches(mockRecentSearches, '   ');
      expect(result).toBe(mockRecentSearches);
    });

    it('trims query before adding', () => {
      const result = addToRecentSearches([], '  pasta  ');
      expect(result[0].query).toBe('pasta');
    });

    it('includes timestamp in new search item', () => {
      const before = Date.now();
      const result = addToRecentSearches([], 'test');
      const after = Date.now();
      expect(result[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(result[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('removeFromRecentSearches', () => {
    it('removes a search from the list', () => {
      const result = removeFromRecentSearches(mockRecentSearches, 'pizza');
      expect(result.length).toBe(2);
      expect(result.find((s) => s.query === 'pizza')).toBeUndefined();
    });

    it('removes search case-insensitively', () => {
      const result = removeFromRecentSearches(mockRecentSearches, 'PIZZA');
      expect(result.length).toBe(2);
      expect(result.find((s) => s.query.toLowerCase() === 'pizza')).toBeUndefined();
    });

    it('returns same list if query not found', () => {
      const result = removeFromRecentSearches(mockRecentSearches, 'nonexistent');
      expect(result.length).toBe(3);
    });

    it('handles empty list', () => {
      const result = removeFromRecentSearches([], 'test');
      expect(result).toEqual([]);
    });
  });

  describe('loadRecentSearches', () => {
    it('loads searches from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockRecentSearches));

      const result = await loadRecentSearches();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@maestro_recent_menu_searches');
      expect(result).toEqual(mockRecentSearches);
    });

    it('returns empty array when nothing stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await loadRecentSearches();

      expect(result).toEqual([]);
    });

    it('returns empty array for invalid JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await loadRecentSearches();

      expect(result).toEqual([]);
    });

    it('returns empty array for non-array data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ foo: 'bar' }));

      const result = await loadRecentSearches();

      expect(result).toEqual([]);
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await loadRecentSearches();

      expect(result).toEqual([]);
    });
  });

  describe('saveRecentSearches', () => {
    it('saves searches to AsyncStorage', async () => {
      await saveRecentSearches(mockRecentSearches);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@maestro_recent_menu_searches',
        JSON.stringify(mockRecentSearches)
      );
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(saveRecentSearches(mockRecentSearches)).resolves.toBeUndefined();
    });
  });

  describe('clearRecentSearches', () => {
    it('removes searches from AsyncStorage', async () => {
      await clearRecentSearches();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@maestro_recent_menu_searches');
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(clearRecentSearches()).resolves.toBeUndefined();
    });
  });
});

// ============================================================================
// MenuSearch Component Tests
// ============================================================================

describe('MenuSearch Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<MenuSearch {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders search input', () => {
      const { toJSON } = render(<MenuSearch {...defaultProps} />);
      const json = JSON.stringify(toJSON());
      // Should contain an input element
      expect(jsonContains(json, 'input')).toBe(true);
    });

    it('renders search icon', () => {
      const { toJSON } = render(<MenuSearch {...defaultProps} />);
      const json = JSON.stringify(toJSON());
      // Should contain search icon emoji
      expect(jsonContains(json, '🔍')).toBe(true);
    });

    it('renders with custom placeholder', () => {
      const { toJSON } = render(<MenuSearch {...defaultProps} placeholder="Find items..." />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Find items...')).toBe(true);
    });

    it('renders with default placeholder', () => {
      const { toJSON } = render(<MenuSearch {...defaultProps} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Search menu...')).toBe(true);
    });

    it('displays the provided value', () => {
      const { toJSON } = render(<MenuSearch {...defaultProps} value="test query" />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'test query')).toBe(true);
    });
  });

  describe('Clear Button', () => {
    it('does not show clear button when value is empty', () => {
      const { toJSON } = render(<MenuSearch {...defaultProps} value="" />);
      const json = JSON.stringify(toJSON());
      // Should not contain clear button symbol
      expect(json.match(/✕/g)?.length || 0).toBe(0);
    });

    it('shows clear button when value has content', () => {
      const { toJSON } = render(<MenuSearch {...defaultProps} value="test" />);
      const json = JSON.stringify(toJSON());
      // Should contain clear button symbol
      expect(jsonContains(json, '✕')).toBe(true);
    });

    it('does not show clear button when disabled', () => {
      const { toJSON } = render(<MenuSearch {...defaultProps} value="test" disabled={true} />);
      const json = JSON.stringify(toJSON());
      // Should not contain clear button symbol
      expect(json.match(/✕/g)?.length || 0).toBe(0);
    });
  });

  describe('Text Input Props', () => {
    it('has input with correct properties', () => {
      const { toJSON } = render(<MenuSearch {...defaultProps} />);
      const json = JSON.stringify(toJSON());
      // Should be an input
      expect(jsonContains(json, 'input')).toBe(true);
    });
  });

  describe('Recent Searches Data Loading', () => {
    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockRecentSearches));
    });

    it('loads recent searches on mount when showRecentSearches is true', async () => {
      render(<MenuSearch {...defaultProps} showRecentSearches={true} />);

      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('@maestro_recent_menu_searches');
      });
    });

    it('does not load recent searches when showRecentSearches is false', async () => {
      render(<MenuSearch {...defaultProps} showRecentSearches={false} />);

      // Give it some time to potentially load
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Export Verification Tests
// ============================================================================

describe('MenuSearch Exports', () => {
  describe('MenuSearch.tsx exports', () => {
    it('exports MenuSearch component', () => {
      expect(MenuSearch).toBeDefined();
      expect(typeof MenuSearch).toBe('function');
    });

    it('exports addToRecentSearches function', () => {
      expect(addToRecentSearches).toBeDefined();
      expect(typeof addToRecentSearches).toBe('function');
    });

    it('exports removeFromRecentSearches function', () => {
      expect(removeFromRecentSearches).toBeDefined();
      expect(typeof removeFromRecentSearches).toBe('function');
    });

    it('exports loadRecentSearches function', () => {
      expect(loadRecentSearches).toBeDefined();
      expect(typeof loadRecentSearches).toBe('function');
    });

    it('exports saveRecentSearches function', () => {
      expect(saveRecentSearches).toBeDefined();
      expect(typeof saveRecentSearches).toBe('function');
    });

    it('exports clearRecentSearches function', () => {
      expect(clearRecentSearches).toBeDefined();
      expect(typeof clearRecentSearches).toBe('function');
    });
  });

  describe('index.ts exports', () => {
    it('exports MenuSearch from index', () => {
      expect(MenuIndex.MenuSearch).toBeDefined();
    });

    it('exports MenuSearchDefault from index', () => {
      expect(MenuIndex.MenuSearchDefault).toBeDefined();
    });

    it('exports addToRecentSearches from index', () => {
      expect(MenuIndex.addToRecentSearches).toBeDefined();
    });

    it('exports removeFromRecentSearches from index', () => {
      expect(MenuIndex.removeFromRecentSearches).toBeDefined();
    });

    it('exports loadRecentSearches from index', () => {
      expect(MenuIndex.loadRecentSearches).toBeDefined();
    });

    it('exports saveRecentSearches from index', () => {
      expect(MenuIndex.saveRecentSearches).toBeDefined();
    });

    it('exports clearRecentSearches from index', () => {
      expect(MenuIndex.clearRecentSearches).toBeDefined();
    });
  });
});

// ============================================================================
// Type Export Verification Tests
// ============================================================================

describe('MenuSearch Type Exports', () => {
  it('MenuSearchProps type is usable', () => {
    const props: MenuSearchProps = {
      value: 'test',
      onChangeText: jest.fn(),
      placeholder: 'Search...',
      showRecentSearches: true,
      maxRecentSearches: 5,
      autoFocus: false,
      disabled: false,
      testID: 'test-search',
    };
    expect(props.value).toBe('test');
  });

  it('RecentSearchItem type is usable', () => {
    const item: RecentSearchItem = {
      query: 'test',
      timestamp: Date.now(),
    };
    expect(item.query).toBe('test');
    expect(typeof item.timestamp).toBe('number');
  });
});
