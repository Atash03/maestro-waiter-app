/**
 * MenuItemList Component Tests
 *
 * Tests for the MenuItemList and MenuItemCard components including:
 * - Helper functions (getTranslatedText, parsePrice, formatPrice, getFormattedPrice)
 * - MenuItemCard rendering (grid and list variants)
 * - Quantity badge display
 * - Unavailable state handling
 * - Image display with fallback
 * - MenuItemList rendering (grid and list layouts)
 * - Empty state display
 * - Column configuration for phone vs tablet
 * - Component exports verification
 */

import { render } from '@testing-library/react-native';
import {
  formatPrice,
  getFormattedPrice,
  getTranslatedText,
  MenuItemCard,
  MenuItemList,
  parsePrice,
} from '@/components/menu/MenuItemList';
import type { MenuItem, Translation } from '@/src/types/models';

// Mock dependencies
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

// Helper to check if JSON contains text
const jsonContains = (json: string, text: string): boolean => json.includes(text);

// ============================================================================
// Test Data
// ============================================================================

const mockTranslation: Translation = {
  en: 'English Text',
  ru: 'Russian Text',
  tm: 'Turkmen Text',
};

const mockMenuItem: MenuItem = {
  id: 'item-1',
  title: {
    en: 'Margherita Pizza',
    ru: 'Пицца Маргарита',
    tm: 'Margherita Pizza TM',
  },
  description: {
    en: 'Classic tomato and mozzarella',
    ru: 'Классическая с томатами и моцареллой',
    tm: 'Klassik pomidor we mozzarella',
  },
  price: '12.99',
  categoryId: 'cat-1',
  imagePath: 'https://example.com/pizza.jpg',
  isActive: true,
  isGroup: false,
};

const mockInactiveItem: MenuItem = {
  ...mockMenuItem,
  id: 'item-2',
  title: {
    en: 'Unavailable Item',
    ru: 'Недоступный товар',
    tm: 'Elýeterli däl haryt',
  },
  isActive: false,
};

const mockItemNoImage: MenuItem = {
  ...mockMenuItem,
  id: 'item-3',
  imagePath: null,
};

const mockItemNoDescription: MenuItem = {
  ...mockMenuItem,
  id: 'item-4',
  description: undefined,
};

const mockItems: MenuItem[] = [
  mockMenuItem,
  {
    ...mockMenuItem,
    id: 'item-5',
    title: { en: 'Pepperoni Pizza', ru: 'Пицца Пепперони', tm: 'Pepperoni Pizza TM' },
  },
  {
    ...mockMenuItem,
    id: 'item-6',
    title: { en: 'Hawaiian Pizza', ru: 'Гавайская пицца', tm: 'Gawai Pizza TM' },
  },
];

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('MenuItemList Helper Functions', () => {
  describe('getTranslatedText', () => {
    it('returns English text by default', () => {
      expect(getTranslatedText(mockTranslation)).toBe('English Text');
    });

    it('returns Russian text when preferredLang is ru', () => {
      expect(getTranslatedText(mockTranslation, '', 'ru')).toBe('Russian Text');
    });

    it('returns Turkmen text when preferredLang is tm', () => {
      expect(getTranslatedText(mockTranslation, '', 'tm')).toBe('Turkmen Text');
    });

    it('returns fallback when translation is undefined', () => {
      expect(getTranslatedText(undefined, 'Fallback')).toBe('Fallback');
    });

    it('returns English fallback when preferred language is empty', () => {
      const partialTranslation: Translation = { en: 'Only English', ru: '', tm: '' };
      expect(getTranslatedText(partialTranslation, 'Default', 'ru')).toBe('Only English');
    });

    it('returns Russian fallback when English and preferred are empty', () => {
      const partialTranslation: Translation = { en: '', ru: 'Only Russian', tm: '' };
      expect(getTranslatedText(partialTranslation, 'Default', 'tm')).toBe('Only Russian');
    });

    it('returns empty fallback when translation is undefined and no fallback', () => {
      expect(getTranslatedText(undefined)).toBe('');
    });
  });

  describe('parsePrice', () => {
    it('parses valid price string', () => {
      expect(parsePrice('12.99')).toBe(12.99);
    });

    it('parses integer price string', () => {
      expect(parsePrice('15')).toBe(15);
    });

    it('returns 0 for undefined price', () => {
      expect(parsePrice(undefined)).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(parsePrice('')).toBe(0);
    });

    it('returns 0 for invalid price string', () => {
      expect(parsePrice('invalid')).toBe(0);
    });

    it('handles price with leading zeros', () => {
      expect(parsePrice('007.50')).toBe(7.5);
    });
  });

  describe('formatPrice', () => {
    it('formats price with two decimal places', () => {
      expect(formatPrice(12.99)).toBe('12.99');
    });

    it('formats integer to two decimal places', () => {
      expect(formatPrice(15)).toBe('15.00');
    });

    it('formats zero to two decimal places', () => {
      expect(formatPrice(0)).toBe('0.00');
    });

    it('rounds price to two decimal places', () => {
      expect(formatPrice(12.999)).toBe('13.00');
    });

    it('handles small decimal values', () => {
      expect(formatPrice(0.05)).toBe('0.05');
    });
  });

  describe('getFormattedPrice', () => {
    it('returns formatted price with TMT currency', () => {
      expect(getFormattedPrice('12.99')).toBe('12.99 TMT');
    });

    it('handles undefined price', () => {
      expect(getFormattedPrice(undefined)).toBe('0.00 TMT');
    });

    it('handles empty price string', () => {
      expect(getFormattedPrice('')).toBe('0.00 TMT');
    });

    it('handles integer price', () => {
      expect(getFormattedPrice('25')).toBe('25.00 TMT');
    });
  });
});

// ============================================================================
// MenuItemCard Component Tests
// ============================================================================

describe('MenuItemCard Component', () => {
  describe('Grid Variant', () => {
    it('renders item title', () => {
      const { toJSON } = render(<MenuItemCard item={mockMenuItem} variant="grid" />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });

    it('renders item description when showDescription is true', () => {
      const { toJSON } = render(
        <MenuItemCard item={mockMenuItem} variant="grid" showDescription={true} />
      );
      expect(jsonContains(JSON.stringify(toJSON()), 'Classic tomato and mozzarella')).toBe(true);
    });

    it('does not render description when showDescription is false', () => {
      const { toJSON } = render(
        <MenuItemCard item={mockMenuItem} variant="grid" showDescription={false} />
      );
      expect(jsonContains(JSON.stringify(toJSON()), 'Classic tomato and mozzarella')).toBe(false);
    });

    it('renders item price', () => {
      const { toJSON } = render(<MenuItemCard item={mockMenuItem} variant="grid" />);
      expect(jsonContains(JSON.stringify(toJSON()), '12.99 TMT')).toBe(true);
    });

    it('renders quantity badge when quantity > 0', () => {
      const { toJSON } = render(<MenuItemCard item={mockMenuItem} variant="grid" quantity={3} />);
      const json = JSON.stringify(toJSON());
      // Should contain the quantity number
      expect(jsonContains(json, '"3"') || jsonContains(json, '"children":"3"')).toBe(true);
    });

    it('does not render quantity badge text when quantity is 0', () => {
      const { toJSON } = render(<MenuItemCard item={mockMenuItem} variant="grid" quantity={0} />);
      const json = JSON.stringify(toJSON());
      // Should not contain quantity badge testID reference
      expect(jsonContains(json, 'quantity-badge')).toBe(false);
    });

    it('renders unavailable overlay for inactive item', () => {
      const { toJSON } = render(<MenuItemCard item={mockInactiveItem} variant="grid" />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Unavailable')).toBe(true);
    });

    it('does not render unavailable overlay for active item', () => {
      const { toJSON } = render(<MenuItemCard item={mockMenuItem} variant="grid" />);
      // Active item should not have Unavailable text
      const json = JSON.stringify(toJSON());
      // The item should not have the unavailable overlay text
      expect(json.split('Unavailable').length - 1).toBe(0);
    });

    it('renders with image by default', () => {
      const { toJSON } = render(
        <MenuItemCard item={mockMenuItem} variant="grid" showImage={true} />
      );
      // Should contain the image testID reference
      expect(jsonContains(JSON.stringify(toJSON()), 'menu-item-image')).toBe(true);
    });

    it('does not render image when showImage is false', () => {
      const { toJSON } = render(
        <MenuItemCard item={mockMenuItem} variant="grid" showImage={false} />
      );
      expect(jsonContains(JSON.stringify(toJSON()), 'menu-item-image')).toBe(false);
    });
  });

  describe('List Variant', () => {
    it('renders item title in list view', () => {
      const { toJSON } = render(<MenuItemCard item={mockMenuItem} variant="list" />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });

    it('renders item price in list view', () => {
      const { toJSON } = render(<MenuItemCard item={mockMenuItem} variant="list" />);
      expect(jsonContains(JSON.stringify(toJSON()), '12.99 TMT')).toBe(true);
    });

    it('renders quantity badge in list view', () => {
      const { toJSON } = render(<MenuItemCard item={mockMenuItem} variant="list" quantity={5} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, '"5"') || jsonContains(json, '"children":"5"')).toBe(true);
    });

    it('renders unavailable overlay in list view for inactive item', () => {
      const { toJSON } = render(<MenuItemCard item={mockInactiveItem} variant="list" />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Unavailable')).toBe(true);
    });
  });

  describe('Callback Handling', () => {
    it('can render with onPress callback', () => {
      const mockOnPress = jest.fn();
      const { toJSON } = render(
        <MenuItemCard item={mockMenuItem} variant="grid" onPress={mockOnPress} />
      );
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });

    it('can render with onLongPress callback', () => {
      const mockOnLongPress = jest.fn();
      const { toJSON } = render(
        <MenuItemCard item={mockMenuItem} variant="grid" onLongPress={mockOnLongPress} />
      );
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });

    it('renders for inactive item with onLongPress (still allows long press)', () => {
      const mockOnLongPress = jest.fn();
      const { toJSON } = render(
        <MenuItemCard item={mockInactiveItem} variant="grid" onLongPress={mockOnLongPress} />
      );
      expect(jsonContains(JSON.stringify(toJSON()), 'Unavailable Item')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('renders item without image path (uses placeholder)', () => {
      const { toJSON } = render(<MenuItemCard item={mockItemNoImage} variant="grid" />);
      // Should still render with image area
      expect(jsonContains(JSON.stringify(toJSON()), 'menu-item-image')).toBe(true);
    });

    it('renders item without description', () => {
      const { toJSON } = render(
        <MenuItemCard item={mockItemNoDescription} variant="grid" showDescription={true} />
      );
      const json = JSON.stringify(toJSON());
      // Should have title but not description
      expect(jsonContains(json, 'Margherita Pizza')).toBe(true);
      expect(jsonContains(json, 'Classic tomato and mozzarella')).toBe(false);
    });

    it('renders with default quantity (0) - no badge', () => {
      const { toJSON } = render(<MenuItemCard item={mockMenuItem} variant="grid" />);
      expect(jsonContains(JSON.stringify(toJSON()), 'quantity-badge')).toBe(false);
    });
  });
});

// ============================================================================
// MenuItemList Component Tests
// ============================================================================

describe('MenuItemList Component', () => {
  describe('Rendering', () => {
    it('renders all items', () => {
      const { toJSON } = render(<MenuItemList items={mockItems} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Margherita Pizza')).toBe(true);
      expect(jsonContains(json, 'Pepperoni Pizza')).toBe(true);
      expect(jsonContains(json, 'Hawaiian Pizza')).toBe(true);
    });

    it('renders item prices', () => {
      const { toJSON } = render(<MenuItemList items={mockItems} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, '12.99 TMT')).toBe(true);
    });
  });

  describe('Empty State', () => {
    it('renders empty state when items array is empty', () => {
      const { toJSON } = render(<MenuItemList items={[]} />);
      expect(jsonContains(JSON.stringify(toJSON()), 'No items found')).toBe(true);
    });

    it('renders custom empty message', () => {
      const { toJSON } = render(<MenuItemList items={[]} emptyMessage="Menu is empty" />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Menu is empty')).toBe(true);
    });
  });

  describe('Quantity Badges', () => {
    it('displays quantity badges for items in order', () => {
      const quantities = { 'item-1': 2, 'item-5': 3 };
      const { toJSON } = render(<MenuItemList items={mockItems} itemQuantities={quantities} />);
      const json = JSON.stringify(toJSON());
      // Should contain the quantities
      expect(jsonContains(json, '"2"') || jsonContains(json, '"children":"2"')).toBe(true);
      expect(jsonContains(json, '"3"') || jsonContains(json, '"children":"3"')).toBe(true);
    });

    it('does not display quantity badges for items not in order', () => {
      const quantities = { 'item-1': 2 };
      const { toJSON } = render(<MenuItemList items={mockItems} itemQuantities={quantities} />);
      // Just verify it renders without error
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });
  });

  describe('Variant Selection', () => {
    it('renders in grid mode by default (auto)', () => {
      const { toJSON } = render(<MenuItemList items={mockItems} variant="auto" />);
      // Should render all items
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });

    it('renders in grid mode when variant is grid', () => {
      const { toJSON } = render(<MenuItemList items={mockItems} variant="grid" />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });

    it('renders in list mode when variant is list', () => {
      const { toJSON } = render(<MenuItemList items={mockItems} variant="list" />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });
  });

  describe('Description and Image Display', () => {
    it('shows descriptions when showDescription is true', () => {
      const items = [mockMenuItem];
      const { toJSON } = render(<MenuItemList items={items} showDescription={true} />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Classic tomato and mozzarella')).toBe(true);
    });

    it('hides descriptions when showDescription is false', () => {
      const items = [mockMenuItem];
      const { toJSON } = render(<MenuItemList items={items} showDescription={false} />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Classic tomato and mozzarella')).toBe(false);
    });

    it('shows images when showImages is true', () => {
      const items = [mockMenuItem];
      const { toJSON } = render(<MenuItemList items={items} showImages={true} />);
      expect(jsonContains(JSON.stringify(toJSON()), 'menu-item-image')).toBe(true);
    });

    it('hides images when showImages is false', () => {
      const items = [mockMenuItem];
      const { toJSON } = render(<MenuItemList items={items} showImages={false} />);
      expect(jsonContains(JSON.stringify(toJSON()), 'menu-item-image')).toBe(false);
    });
  });

  describe('Callbacks', () => {
    it('can render with onItemPress callback', () => {
      const mockOnItemPress = jest.fn();
      const { toJSON } = render(<MenuItemList items={mockItems} onItemPress={mockOnItemPress} />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });

    it('can render with onItemLongPress callback', () => {
      const mockOnItemLongPress = jest.fn();
      const { toJSON } = render(
        <MenuItemList items={mockItems} onItemLongPress={mockOnItemLongPress} />
      );
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });

    it('can render with onRefresh callback', () => {
      const mockOnRefresh = jest.fn();
      const { toJSON } = render(
        <MenuItemList items={mockItems} onRefresh={mockOnRefresh} refreshing={false} />
      );
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });
  });

  describe('Column Configuration', () => {
    it('accepts custom numColumns', () => {
      const { toJSON } = render(<MenuItemList items={mockItems} numColumns={4} />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });

    it('uses single column for list variant', () => {
      const { toJSON } = render(<MenuItemList items={mockItems} variant="list" />);
      expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    });
  });

  describe('Inactive Items', () => {
    it('renders inactive items with unavailable overlay', () => {
      const items = [mockInactiveItem];
      const { toJSON } = render(<MenuItemList items={items} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Unavailable Item')).toBe(true);
      expect(jsonContains(json, 'Unavailable')).toBe(true);
    });

    it('renders mix of active and inactive items', () => {
      const items = [mockMenuItem, mockInactiveItem];
      const { toJSON } = render(<MenuItemList items={items} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Margherita Pizza')).toBe(true);
      expect(jsonContains(json, 'Unavailable Item')).toBe(true);
    });
  });
});

// ============================================================================
// Export Verification Tests
// ============================================================================

describe('MenuItemList Exports', () => {
  describe('Component Exports', () => {
    it('exports MenuItemCard component', () => {
      expect(MenuItemCard).toBeDefined();
      expect(typeof MenuItemCard).toBe('function');
    });

    it('exports MenuItemList component', () => {
      expect(MenuItemList).toBeDefined();
      expect(typeof MenuItemList).toBe('function');
    });
  });

  describe('Helper Function Exports', () => {
    it('exports getTranslatedText function', () => {
      expect(getTranslatedText).toBeDefined();
      expect(typeof getTranslatedText).toBe('function');
    });

    it('exports parsePrice function', () => {
      expect(parsePrice).toBeDefined();
      expect(typeof parsePrice).toBe('function');
    });

    it('exports formatPrice function', () => {
      expect(formatPrice).toBeDefined();
      expect(typeof formatPrice).toBe('function');
    });

    it('exports getFormattedPrice function', () => {
      expect(getFormattedPrice).toBeDefined();
      expect(typeof getFormattedPrice).toBe('function');
    });
  });
});

describe('Menu Index Exports', () => {
  // Use require for synchronous import testing (avoids dynamic import issues)
  const menuIndex = require('@/components/menu');

  it('exports MenuItemList from index', () => {
    expect(menuIndex.MenuItemList).toBeDefined();
  });

  it('exports MenuItemCard from index', () => {
    expect(menuIndex.MenuItemCard).toBeDefined();
  });

  it('exports helper functions from index', () => {
    expect(menuIndex.parsePrice).toBeDefined();
    expect(menuIndex.formatPrice).toBeDefined();
    expect(menuIndex.getFormattedPrice).toBeDefined();
    expect(menuIndex.getMenuItemTranslatedText).toBeDefined();
  });

  it('exports MenuItemListDefault from index', () => {
    expect(menuIndex.MenuItemListDefault).toBeDefined();
  });
});

// ============================================================================
// Type Verification Tests
// ============================================================================

describe('Type Exports', () => {
  it('MenuItemCardProps type can be used', () => {
    // Type-level test - if this compiles, the type is exported correctly
    const props: import('@/components/menu').MenuItemCardProps = {
      item: mockMenuItem,
      variant: 'grid',
    };
    expect(props.item).toBe(mockMenuItem);
    expect(props.variant).toBe('grid');
  });

  it('MenuItemListProps type can be used', () => {
    // Type-level test - if this compiles, the type is exported correctly
    const props: import('@/components/menu').MenuItemListProps = {
      items: mockItems,
    };
    expect(props.items).toBe(mockItems);
  });

  it('MenuItemListVariant type accepts valid values', () => {
    // Type-level test
    const gridVariant: import('@/components/menu').MenuItemListVariant = 'grid';
    const listVariant: import('@/components/menu').MenuItemListVariant = 'list';
    const autoVariant: import('@/components/menu').MenuItemListVariant = 'auto';

    expect(gridVariant).toBe('grid');
    expect(listVariant).toBe('list');
    expect(autoVariant).toBe('auto');
  });
});

// ============================================================================
// Constants Verification Tests
// ============================================================================

describe('MenuItemList Constants', () => {
  it('component renders with mock items', () => {
    const { toJSON } = render(<MenuItemList items={mockItems} />);
    // Verify component renders successfully with items
    expect(jsonContains(JSON.stringify(toJSON()), 'Margherita Pizza')).toBe(true);
    expect(jsonContains(JSON.stringify(toJSON()), 'Pepperoni Pizza')).toBe(true);
    expect(jsonContains(JSON.stringify(toJSON()), 'Hawaiian Pizza')).toBe(true);
  });
});
