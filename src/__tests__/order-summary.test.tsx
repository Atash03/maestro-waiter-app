/**
 * Tests for OrderSummary component
 *
 * Covers:
 * - Helper functions (getTranslatedText, parsePrice, formatPrice, etc.)
 * - OrderSummaryItem component
 * - OrderSummary component
 * - Service fee display
 * - Quantity controls
 * - Empty state
 * - Export verification
 */

import { render } from '@testing-library/react-native';
import * as OrdersIndex from '@/components/orders';
import {
  calculateExtrasTotal,
  calculateItemSubtotal,
  calculateOrderTotal,
  formatPrice,
  getExtrasText,
  getFormattedPrice,
  getTranslatedText,
  type LocalOrderItem,
  OrderSummary,
  OrderSummaryItem,
  type OrderSummaryItemProps,
  type OrderSummaryProps,
  parsePrice,
  type ServiceFeeInfo,
} from '@/components/orders/OrderSummary';
import type { Translation } from '@/src/types/models';

// Mock the hooks
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe('OrderSummary Helper Functions', () => {
  describe('getTranslatedText', () => {
    it('returns English text by default', () => {
      const translation = { en: 'Hello', ru: 'Привет', tm: 'Salam' };
      expect(getTranslatedText(translation)).toBe('Hello');
    });

    it('returns Russian text when preferred', () => {
      const translation = { en: 'Hello', ru: 'Привет', tm: 'Salam' };
      expect(getTranslatedText(translation, '', 'ru')).toBe('Привет');
    });

    it('returns Turkmen text when preferred', () => {
      const translation = { en: 'Hello', ru: 'Привет', tm: 'Salam' };
      expect(getTranslatedText(translation, '', 'tm')).toBe('Salam');
    });

    it('returns fallback when translation is undefined', () => {
      expect(getTranslatedText(undefined, 'Fallback')).toBe('Fallback');
    });

    it('returns fallback when preferred language is empty', () => {
      const translation = { en: '', ru: 'Привет', tm: '' };
      expect(getTranslatedText(translation, 'Fallback', 'en')).toBe('Привет');
    });

    it('falls back through languages in order', () => {
      const translation = { en: '', ru: '', tm: 'Salam' };
      expect(getTranslatedText(translation)).toBe('Salam');
    });
  });

  describe('parsePrice', () => {
    it('parses valid price string', () => {
      expect(parsePrice('10.50')).toBe(10.5);
    });

    it('parses integer price string', () => {
      expect(parsePrice('15')).toBe(15);
    });

    it('returns 0 for undefined', () => {
      expect(parsePrice(undefined)).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(parsePrice('')).toBe(0);
    });

    it('returns 0 for invalid string', () => {
      expect(parsePrice('invalid')).toBe(0);
    });

    it('parses price with leading zeros', () => {
      expect(parsePrice('007.50')).toBe(7.5);
    });
  });

  describe('formatPrice', () => {
    it('formats with two decimal places', () => {
      expect(formatPrice(10.5)).toBe('10.50');
    });

    it('formats zero', () => {
      expect(formatPrice(0)).toBe('0.00');
    });

    it('formats integer', () => {
      expect(formatPrice(15)).toBe('15.00');
    });

    it('rounds to two decimal places', () => {
      expect(formatPrice(10.999)).toBe('11.00');
    });

    it('handles small decimals', () => {
      expect(formatPrice(0.01)).toBe('0.01');
    });
  });

  describe('getFormattedPrice', () => {
    it('formats number with dollar sign', () => {
      expect(getFormattedPrice(10.5)).toBe('$10.50');
    });

    it('formats string price with dollar sign', () => {
      expect(getFormattedPrice('15.99')).toBe('$15.99');
    });

    it('handles undefined', () => {
      expect(getFormattedPrice(undefined)).toBe('$0.00');
    });

    it('handles empty string', () => {
      expect(getFormattedPrice('')).toBe('$0.00');
    });
  });

  describe('calculateExtrasTotal', () => {
    it('calculates total for multiple extras', () => {
      const extras = [
        { extraId: 'e1', quantity: 2 },
        { extraId: 'e2', quantity: 1 },
      ];
      const availableExtras = [
        { id: 'e1', actualPrice: '1.50', title: { en: '', ru: '', tm: '' }, isActive: true },
        { id: 'e2', actualPrice: '2.00', title: { en: '', ru: '', tm: '' }, isActive: true },
      ];
      // (2 * 1.50) + (1 * 2.00) = 5.00
      expect(calculateExtrasTotal(extras, availableExtras)).toBe(5);
    });

    it('returns 0 for empty extras', () => {
      expect(calculateExtrasTotal([], [])).toBe(0);
    });

    it('ignores extras not in availableExtras but uses price fallback', () => {
      const extras = [{ extraId: 'e1', quantity: 1, price: '3.00' }];
      expect(calculateExtrasTotal(extras, [])).toBe(3);
    });

    it('calculates single extra', () => {
      const extras = [{ extraId: 'e1', quantity: 3 }];
      const availableExtras = [
        { id: 'e1', actualPrice: '2.50', title: { en: '', ru: '', tm: '' }, isActive: true },
      ];
      expect(calculateExtrasTotal(extras, availableExtras)).toBe(7.5);
    });
  });

  describe('calculateItemSubtotal', () => {
    const createMockItem = (overrides: Partial<LocalOrderItem> = {}): LocalOrderItem => ({
      id: 'test',
      menuItemId: 'menu-1',
      menuItem: {
        id: 'menu-1',
        title: { en: 'Test', ru: '', tm: '' },
        price: '10.00',
        categoryId: 'cat-1',
        imagePath: null,
        isActive: true,
        isGroup: false,
      },
      quantity: 1,
      notes: '',
      extras: [],
      unitPrice: 10,
      subtotal: 10,
      ...overrides,
    });

    it('calculates subtotal without extras', () => {
      const item = createMockItem({ unitPrice: 10, quantity: 2 });
      expect(calculateItemSubtotal(item, [])).toBe(20);
    });

    it('calculates subtotal with extras', () => {
      const item = createMockItem({
        unitPrice: 10,
        quantity: 2,
        extras: [{ extraId: 'e1', quantity: 1 }],
      });
      const availableExtras = [
        { id: 'e1', actualPrice: '2.00', title: { en: '', ru: '', tm: '' }, isActive: true },
      ];
      // (10 * 2) + (2 * 2) = 24
      expect(calculateItemSubtotal(item, availableExtras)).toBe(24);
    });
  });

  describe('calculateOrderTotal', () => {
    it('calculates total from item subtotals', () => {
      const items = [
        { subtotal: 10 } as LocalOrderItem,
        { subtotal: 15 } as LocalOrderItem,
        { subtotal: 5 } as LocalOrderItem,
      ];
      expect(calculateOrderTotal(items)).toBe(30);
    });

    it('returns 0 for empty items', () => {
      expect(calculateOrderTotal([])).toBe(0);
    });

    it('handles single item', () => {
      const items = [{ subtotal: 25.5 } as LocalOrderItem];
      expect(calculateOrderTotal(items)).toBe(25.5);
    });
  });

  describe('getExtrasText', () => {
    it('returns empty string for no extras', () => {
      expect(getExtrasText([])).toBe('');
    });

    it('joins extras with comma', () => {
      const extras = [
        { extraId: 'e1', quantity: 1, title: { en: 'Cheese', ru: 'Сыр', tm: 'Peýnir' } },
        { extraId: 'e2', quantity: 1, title: { en: 'Bacon', ru: 'Бекон', tm: 'Bekon' } },
      ];
      expect(getExtrasText(extras)).toBe('Cheese, Bacon');
    });

    it('uses fallback for missing title', () => {
      const extras = [{ extraId: 'e1', quantity: 1, title: undefined }] as Array<{
        extraId: string;
        quantity: number;
        title: Translation | undefined;
      }>;
      expect(getExtrasText(extras)).toBe('Extra');
    });
  });
});

// ============================================================================
// OrderSummaryItem Component Tests
// ============================================================================

describe('OrderSummaryItem Component', () => {
  const createMockItem = (overrides: Partial<LocalOrderItem> = {}): LocalOrderItem => ({
    id: 'item-1',
    menuItemId: 'menu-1',
    menuItem: {
      id: 'menu-1',
      title: { en: 'Burger', ru: 'Бургер', tm: 'Burger' },
      price: '10.00',
      categoryId: 'cat-1',
      imagePath: null,
      isActive: true,
      isGroup: false,
    },
    quantity: 2,
    notes: '',
    extras: [],
    unitPrice: 10,
    subtotal: 20,
    ...overrides,
  });

  it('renders without crashing', () => {
    const mockItem = createMockItem();
    const { toJSON } = render(
      <OrderSummaryItem item={mockItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders item title in output', () => {
    const mockItem = createMockItem();
    const { toJSON } = render(
      <OrderSummaryItem item={mockItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('Burger');
  });

  it('renders quantity in output', () => {
    const mockItem = createMockItem({ quantity: 5 });
    const { toJSON } = render(
      <OrderSummaryItem item={mockItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('5');
  });

  it('renders subtotal in output', () => {
    const mockItem = createMockItem({ subtotal: 25.5 });
    const { toJSON } = render(
      <OrderSummaryItem item={mockItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('$25.50');
  });

  it('renders extras when present', () => {
    const mockItem = createMockItem({
      extras: [{ extraId: 'e1', quantity: 1, title: { en: 'Cheese', ru: 'Сыр', tm: 'Peýnir' } }],
    });
    const { toJSON } = render(
      <OrderSummaryItem item={mockItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('Cheese');
  });

  it('renders notes when present', () => {
    const mockItem = createMockItem({ notes: 'No onions' });
    const { toJSON } = render(
      <OrderSummaryItem item={mockItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('No onions');
  });

  it('renders remove button', () => {
    const mockItem = createMockItem();
    const { toJSON } = render(
      <OrderSummaryItem item={mockItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('✕');
  });

  it('renders quantity controls', () => {
    const mockItem = createMockItem();
    const { toJSON } = render(
      <OrderSummaryItem item={mockItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('−');
    expect(jsonOutput).toContain('+');
  });

  it('renders edit button when onEdit is provided', () => {
    const mockItem = createMockItem();
    const { toJSON } = render(
      <OrderSummaryItem
        item={mockItem}
        onEdit={jest.fn()}
        onRemove={jest.fn()}
        onUpdateQuantity={jest.fn()}
      />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('✎');
  });

  it('does not render edit button when onEdit is not provided', () => {
    const mockItem = createMockItem();
    const { toJSON } = render(
      <OrderSummaryItem item={mockItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).not.toContain('✎');
  });

  it('can be instantiated with confirmBeforeRemove prop', () => {
    const mockItem = createMockItem();
    const { toJSON } = render(
      <OrderSummaryItem
        item={mockItem}
        onRemove={jest.fn()}
        onUpdateQuantity={jest.fn()}
        confirmBeforeRemove={true}
      />
    );
    expect(toJSON()).toBeTruthy();
  });
});

// ============================================================================
// OrderSummary Component Tests
// ============================================================================

describe('OrderSummary Component', () => {
  const createMockItems = (): LocalOrderItem[] => [
    {
      id: 'item-1',
      menuItemId: 'menu-1',
      menuItem: {
        id: 'menu-1',
        title: { en: 'Burger', ru: 'Бургер', tm: 'Burger' },
        price: '10.00',
        categoryId: 'cat-1',
        imagePath: null,
        isActive: true,
        isGroup: false,
      },
      quantity: 2,
      notes: '',
      extras: [],
      unitPrice: 10,
      subtotal: 20,
    },
    {
      id: 'item-2',
      menuItemId: 'menu-2',
      menuItem: {
        id: 'menu-2',
        title: { en: 'Fries', ru: 'Фри', tm: 'Fry' },
        price: '5.00',
        categoryId: 'cat-1',
        imagePath: null,
        isActive: true,
        isGroup: false,
      },
      quantity: 1,
      notes: '',
      extras: [],
      unitPrice: 5,
      subtotal: 5,
    },
  ];

  it('renders without crashing', () => {
    const mockItems = createMockItems();
    const { toJSON } = render(
      <OrderSummary
        items={mockItems}
        total={25}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders order items', () => {
    const mockItems = createMockItems();
    const { toJSON } = render(
      <OrderSummary
        items={mockItems}
        total={25}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
      />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('Burger');
    expect(jsonOutput).toContain('Fries');
  });

  it('renders empty state when no items', () => {
    const { toJSON } = render(
      <OrderSummary
        items={[]}
        total={0}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
      />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('Tap items to add to order');
  });

  it('renders custom empty message', () => {
    const { toJSON } = render(
      <OrderSummary
        items={[]}
        total={0}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
        emptyMessage="Add items to your order"
      />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('Add items to your order');
  });

  it('renders total amount', () => {
    const mockItems = createMockItems();
    const { toJSON } = render(
      <OrderSummary
        items={mockItems}
        total={25}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
      />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('$25.00');
  });

  it('renders item count', () => {
    const mockItems = createMockItems();
    const { toJSON } = render(
      <OrderSummary
        items={mockItems}
        total={25}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
      />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('Items (3)');
  });

  it('renders send order button', () => {
    const mockItems = createMockItems();
    const { toJSON } = render(
      <OrderSummary
        items={mockItems}
        total={25}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
      />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('Send to Kitchen');
  });

  it('renders custom send button text', () => {
    const mockItems = createMockItems();
    const { toJSON } = render(
      <OrderSummary
        items={mockItems}
        total={25}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
        sendButtonText="Place Order"
      />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('Place Order');
  });

  it('renders service fee when provided', () => {
    const mockItems = createMockItems();
    const serviceFee: ServiceFeeInfo = {
      id: 'sf-1',
      title: { en: 'Service Fee', ru: 'Сервисный сбор', tm: 'Hyzmat tölegi' },
      amount: 2.5,
      percent: '10',
    };
    const { toJSON } = render(
      <OrderSummary
        items={mockItems}
        total={27.5}
        subtotal={25}
        serviceFee={serviceFee}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
      />
    );
    const jsonOutput = JSON.stringify(toJSON());
    expect(jsonOutput).toContain('Service Fee');
    expect(jsonOutput).toContain('10%');
    expect(jsonOutput).toContain('$2.50');
    expect(jsonOutput).toContain('Subtotal');
  });

  it('renders tablet variant correctly', () => {
    const mockItems = createMockItems();
    const { toJSON } = render(
      <OrderSummary
        items={mockItems}
        total={25}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
        isTablet={true}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders bottom sheet variant correctly', () => {
    const mockItems = createMockItems();
    const { toJSON } = render(
      <OrderSummary
        items={mockItems}
        total={25}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
        variant="bottomSheet"
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with sending state', () => {
    const mockItems = createMockItems();
    const { toJSON } = render(
      <OrderSummary
        items={mockItems}
        total={25}
        onRemoveItem={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onSendOrder={jest.fn()}
        isSending={true}
      />
    );
    expect(toJSON()).toBeTruthy();
  });
});

// ============================================================================
// Export Verification Tests
// ============================================================================

describe('OrderSummary Exports', () => {
  describe('Component exports from OrderSummary.tsx', () => {
    it('exports OrderSummary component', () => {
      expect(OrderSummary).toBeDefined();
      expect(typeof OrderSummary).toBe('function');
    });

    it('exports OrderSummaryItem component', () => {
      expect(OrderSummaryItem).toBeDefined();
      expect(typeof OrderSummaryItem).toBe('function');
    });
  });

  describe('Helper function exports', () => {
    it('exports getTranslatedText', () => {
      expect(getTranslatedText).toBeDefined();
      expect(typeof getTranslatedText).toBe('function');
    });

    it('exports parsePrice', () => {
      expect(parsePrice).toBeDefined();
      expect(typeof parsePrice).toBe('function');
    });

    it('exports formatPrice', () => {
      expect(formatPrice).toBeDefined();
      expect(typeof formatPrice).toBe('function');
    });

    it('exports getFormattedPrice', () => {
      expect(getFormattedPrice).toBeDefined();
      expect(typeof getFormattedPrice).toBe('function');
    });

    it('exports calculateExtrasTotal', () => {
      expect(calculateExtrasTotal).toBeDefined();
      expect(typeof calculateExtrasTotal).toBe('function');
    });

    it('exports calculateItemSubtotal', () => {
      expect(calculateItemSubtotal).toBeDefined();
      expect(typeof calculateItemSubtotal).toBe('function');
    });

    it('exports calculateOrderTotal', () => {
      expect(calculateOrderTotal).toBeDefined();
      expect(typeof calculateOrderTotal).toBe('function');
    });

    it('exports getExtrasText', () => {
      expect(getExtrasText).toBeDefined();
      expect(typeof getExtrasText).toBe('function');
    });
  });

  describe('Index exports', () => {
    it('exports OrderSummary from index', () => {
      expect(OrdersIndex.OrderSummary).toBeDefined();
    });

    it('exports OrderSummaryItem from index', () => {
      expect(OrdersIndex.OrderSummaryItem).toBeDefined();
    });

    it('exports helper functions from index', () => {
      expect(OrdersIndex.getTranslatedText).toBeDefined();
      expect(OrdersIndex.parsePrice).toBeDefined();
      expect(OrdersIndex.formatPrice).toBeDefined();
      expect(OrdersIndex.getFormattedPrice).toBeDefined();
      expect(OrdersIndex.calculateExtrasTotal).toBeDefined();
      expect(OrdersIndex.calculateItemSubtotal).toBeDefined();
      expect(OrdersIndex.calculateOrderTotal).toBeDefined();
      expect(OrdersIndex.getExtrasText).toBeDefined();
    });

    it('exports default from index', () => {
      expect(OrdersIndex.default).toBeDefined();
    });
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe('OrderSummary Type Exports', () => {
  it('LocalOrderItem type is usable', () => {
    const item: LocalOrderItem = {
      id: 'test',
      menuItemId: 'menu-1',
      menuItem: {
        id: 'menu-1',
        title: { en: 'Test', ru: '', tm: '' },
        price: '10.00',
        categoryId: 'cat-1',
        imagePath: null,
        isActive: true,
        isGroup: false,
      },
      quantity: 1,
      notes: '',
      extras: [],
      unitPrice: 10,
      subtotal: 10,
    };
    expect(item.id).toBe('test');
  });

  it('ServiceFeeInfo type is usable', () => {
    const serviceFee: ServiceFeeInfo = {
      id: 'sf-1',
      title: { en: 'Service', ru: '', tm: '' },
      amount: 5,
    };
    expect(serviceFee.id).toBe('sf-1');
  });

  it('OrderSummaryProps type is usable', () => {
    const props: OrderSummaryProps = {
      items: [],
      total: 0,
      onRemoveItem: () => {},
      onUpdateQuantity: () => {},
      onSendOrder: () => {},
    };
    expect(props.total).toBe(0);
  });

  it('OrderSummaryItemProps type is usable', () => {
    const props: OrderSummaryItemProps = {
      item: {
        id: 'test',
        menuItemId: 'menu-1',
        menuItem: {
          id: 'menu-1',
          title: { en: 'Test', ru: '', tm: '' },
          price: '10.00',
          categoryId: 'cat-1',
          imagePath: null,
          isActive: true,
          isGroup: false,
        },
        quantity: 1,
        notes: '',
        extras: [],
        unitPrice: 10,
        subtotal: 10,
      },
      onRemove: () => {},
      onUpdateQuantity: () => {},
    };
    expect(typeof props.onRemove).toBe('function');
  });
});
