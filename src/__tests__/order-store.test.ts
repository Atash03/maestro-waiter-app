/**
 * Order Store Tests
 *
 * Tests for the order store functionality including:
 * - Add item to order
 * - Edit item quantity and notes
 * - Remove item from order
 * - Duplicate item with same customizations
 * - Helper functions
 * - Custom hooks
 */

import { act, renderHook } from '@testing-library/react-native';
import {
  calculateExtrasTotal,
  calculateItemSubtotal,
  calculateSelectedExtrasTotal,
  clampQuantity,
  convertToOrderItemExtras,
  formatPrice,
  generateLocalId,
  getFormattedPrice,
  MAX_NOTES_LENGTH,
  MAX_QUANTITY,
  MIN_QUANTITY,
  parsePrice,
  truncateNotes,
  useAvailableExtras,
  useCurrentOrder,
  useMenuItemQuantityInOrder,
  useOrderActions,
  useOrderItems,
  useOrderModified,
  useOrderNotes,
  useOrderStore,
  useOrderTableId,
  useOrderTotals,
} from '../stores/orderStore';
import type { Extra, MenuItem, Translation } from '../types/models';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockMenuItem = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  id: 'menu-item-1',
  title: { en: 'Test Item', ru: 'Тестовый элемент', tm: 'Test elementi' },
  description: { en: 'Test description', ru: 'Тестовое описание', tm: 'Test beýany' },
  price: '10.00',
  categoryId: 'cat-1',
  imagePath: null,
  isActive: true,
  isGroup: false,
  ...overrides,
});

const createMockExtra = (overrides: Partial<Extra> = {}): Extra => ({
  id: 'extra-1',
  title: { en: 'Extra Cheese', ru: 'Дополнительный сыр', tm: 'Goşmaça peýnir' },
  actualPrice: '2.50',
  isActive: true,
  ...overrides,
});

const createMockTranslation = (text: string): Translation => ({
  en: `${text} EN`,
  ru: `${text} RU`,
  tm: `${text} TM`,
});

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe('Order Store Helper Functions', () => {
  describe('generateLocalId', () => {
    it('should generate a unique ID starting with local_', () => {
      const id = generateLocalId();
      expect(id).toMatch(/^local_\d+_[a-z0-9]+$/);
    });

    it('should generate different IDs on each call', () => {
      const id1 = generateLocalId();
      const id2 = generateLocalId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('parsePrice', () => {
    it('should parse valid price string', () => {
      expect(parsePrice('10.50')).toBe(10.5);
    });

    it('should return 0 for undefined', () => {
      expect(parsePrice(undefined)).toBe(0);
    });

    it('should return 0 for empty string', () => {
      expect(parsePrice('')).toBe(0);
    });

    it('should return 0 for invalid string', () => {
      expect(parsePrice('abc')).toBe(0);
    });

    it('should parse integer string', () => {
      expect(parsePrice('5')).toBe(5);
    });
  });

  describe('formatPrice', () => {
    it('should format price with 2 decimal places', () => {
      expect(formatPrice(10.5)).toBe('10.50');
    });

    it('should format whole number with 2 decimal places', () => {
      expect(formatPrice(10)).toBe('10.00');
    });

    it('should round to 2 decimal places', () => {
      expect(formatPrice(10.555)).toBe('10.55');
    });

    it('should handle zero', () => {
      expect(formatPrice(0)).toBe('0.00');
    });
  });

  describe('getFormattedPrice', () => {
    it('should format number with dollar sign', () => {
      expect(getFormattedPrice(10.5)).toBe('$10.50');
    });

    it('should parse and format string price', () => {
      expect(getFormattedPrice('10.50')).toBe('$10.50');
    });

    it('should handle undefined', () => {
      expect(getFormattedPrice(undefined)).toBe('$0.00');
    });
  });

  describe('clampQuantity', () => {
    it('should return same value if within range', () => {
      expect(clampQuantity(5)).toBe(5);
    });

    it('should clamp to MIN_QUANTITY', () => {
      expect(clampQuantity(0)).toBe(MIN_QUANTITY);
    });

    it('should clamp to MAX_QUANTITY', () => {
      expect(clampQuantity(100)).toBe(MAX_QUANTITY);
    });

    it('should round decimal values', () => {
      expect(clampQuantity(5.7)).toBe(6);
    });
  });

  describe('truncateNotes', () => {
    it('should return same string if within limit', () => {
      const notes = 'Short note';
      expect(truncateNotes(notes)).toBe(notes);
    });

    it('should truncate string exceeding limit', () => {
      const longNotes = 'a'.repeat(600);
      expect(truncateNotes(longNotes).length).toBe(MAX_NOTES_LENGTH);
    });
  });

  describe('calculateSelectedExtrasTotal', () => {
    it('should calculate total for selected extras', () => {
      const extras: Extra[] = [
        createMockExtra({ id: 'e1', actualPrice: '2.00' }),
        createMockExtra({ id: 'e2', actualPrice: '3.00' }),
      ];
      const selected = [
        { extraId: 'e1', quantity: 2 },
        { extraId: 'e2', quantity: 1 },
      ];
      expect(calculateSelectedExtrasTotal(selected, extras)).toBe(7); // 2*2 + 3*1
    });

    it('should return 0 for empty selections', () => {
      expect(calculateSelectedExtrasTotal([], [])).toBe(0);
    });

    it('should use fallback price if extra not found', () => {
      const selected = [{ extraId: 'missing', quantity: 1, price: '5.00' }];
      expect(calculateSelectedExtrasTotal(selected, [])).toBe(5);
    });
  });

  describe('calculateExtrasTotal', () => {
    it('should calculate total from OrderItemExtra array', () => {
      const extras: Extra[] = [createMockExtra({ id: 'e1', actualPrice: '2.50' })];
      const orderExtras = [{ extraId: 'e1', quantity: 2 }];
      expect(calculateExtrasTotal(orderExtras, extras)).toBe(5);
    });

    it('should use fallback price from OrderItemExtra', () => {
      const orderExtras = [{ extraId: 'missing', quantity: 1, pricePerUnit: '3.00' }];
      expect(calculateExtrasTotal(orderExtras, [])).toBe(3);
    });
  });

  describe('calculateItemSubtotal', () => {
    it('should calculate subtotal without extras', () => {
      expect(calculateItemSubtotal(10, 2, [], [])).toBe(20);
    });

    it('should calculate subtotal with extras', () => {
      const extras: Extra[] = [createMockExtra({ id: 'e1', actualPrice: '2.00' })];
      const orderExtras = [{ extraId: 'e1', quantity: 1 }];
      // (10 + 2) * 2 = 24
      expect(calculateItemSubtotal(10, 2, orderExtras, extras)).toBe(24);
    });
  });

  describe('convertToOrderItemExtras', () => {
    it('should convert selected extras to order item extras', () => {
      const extras: Extra[] = [
        createMockExtra({
          id: 'e1',
          title: createMockTranslation('Cheese'),
          actualPrice: '2.50',
        }),
      ];
      const selected = [{ extraId: 'e1', quantity: 2 }];
      const result = convertToOrderItemExtras(selected, extras);

      expect(result).toHaveLength(1);
      expect(result[0].extraId).toBe('e1');
      expect(result[0].quantity).toBe(2);
      expect(result[0].pricePerUnit).toBe('2.50');
    });

    it('should preserve selected extra data if not found in available extras', () => {
      const selected = [
        {
          extraId: 'missing',
          quantity: 1,
          title: createMockTranslation('Custom'),
          price: '5.00',
        },
      ];
      const result = convertToOrderItemExtras(selected, []);

      expect(result[0].extraId).toBe('missing');
      expect(result[0].extraTitle).toEqual(createMockTranslation('Custom'));
      expect(result[0].pricePerUnit).toBe('5.00');
    });
  });
});

// ============================================================================
// Store Tests
// ============================================================================

describe('Order Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useOrderStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have null currentOrder initially', () => {
      const state = useOrderStore.getState();
      expect(state.currentOrder).toBeNull();
    });

    it('should have empty availableExtras initially', () => {
      const state = useOrderStore.getState();
      expect(state.availableExtras).toEqual([]);
    });

    it('should have isModified as false initially', () => {
      const state = useOrderStore.getState();
      expect(state.isModified).toBe(false);
    });

    it('should have null lastModifiedAt initially', () => {
      const state = useOrderStore.getState();
      expect(state.lastModifiedAt).toBeNull();
    });
  });

  describe('initializeOrder', () => {
    it('should create new order with tableId', () => {
      const { initializeOrder } = useOrderStore.getState();
      initializeOrder('table-1');

      const state = useOrderStore.getState();
      expect(state.currentOrder).not.toBeNull();
      expect(state.currentOrder?.tableId).toBe('table-1');
      expect(state.currentOrder?.items).toEqual([]);
      expect(state.currentOrder?.notes).toBe('');
    });

    it('should set lastModifiedAt timestamp', () => {
      const beforeTime = Date.now();
      useOrderStore.getState().initializeOrder('table-1');
      const afterTime = Date.now();

      const state = useOrderStore.getState();
      expect(state.lastModifiedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(state.lastModifiedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should reset isModified to false', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const state = useOrderStore.getState();
      expect(state.isModified).toBe(false);
    });
  });

  describe('clearOrder', () => {
    it('should set currentOrder to null', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().clearOrder();

      const state = useOrderStore.getState();
      expect(state.currentOrder).toBeNull();
    });

    it('should reset isModified', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.getState().clearOrder();

      const state = useOrderStore.getState();
      expect(state.isModified).toBe(false);
    });

    it('should reset lastModifiedAt', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().clearOrder();

      const state = useOrderStore.getState();
      expect(state.lastModifiedAt).toBeNull();
    });
  });

  describe('setOrderNotes', () => {
    it('should set order notes', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().setOrderNotes('Special request');

      const state = useOrderStore.getState();
      expect(state.currentOrder?.notes).toBe('Special request');
    });

    it('should truncate long notes', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const longNotes = 'a'.repeat(600);
      useOrderStore.getState().setOrderNotes(longNotes);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.notes.length).toBe(MAX_NOTES_LENGTH);
    });

    it('should set isModified to true', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().setOrderNotes('Note');

      const state = useOrderStore.getState();
      expect(state.isModified).toBe(true);
    });

    it('should not change state if no order exists', () => {
      useOrderStore.getState().setOrderNotes('Note');
      const state = useOrderStore.getState();
      expect(state.currentOrder).toBeNull();
    });
  });

  describe('addItem', () => {
    it('should add item to order', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const menuItem = createMockMenuItem();
      const itemId = useOrderStore.getState().addItem(menuItem);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items).toHaveLength(1);
      expect(state.currentOrder?.items[0].id).toBe(itemId);
      expect(state.currentOrder?.items[0].menuItemId).toBe(menuItem.id);
    });

    it('should set default quantity to 1', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem());

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].quantity).toBe(1);
    });

    it('should accept custom quantity', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem(), 3);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].quantity).toBe(3);
    });

    it('should clamp quantity to valid range', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem(), 150);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].quantity).toBe(MAX_QUANTITY);
    });

    it('should accept notes parameter', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem(), 1, 'No onions');

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].notes).toBe('No onions');
    });

    it('should truncate long notes', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const longNotes = 'a'.repeat(600);
      useOrderStore.getState().addItem(createMockMenuItem(), 1, longNotes);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].notes.length).toBe(MAX_NOTES_LENGTH);
    });

    it('should accept extras parameter', () => {
      const extra = createMockExtra();
      useOrderStore.getState().setAvailableExtras([extra]);
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore
        .getState()
        .addItem(createMockMenuItem(), 1, '', [{ extraId: extra.id, quantity: 2 }]);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].extras).toHaveLength(1);
      expect(state.currentOrder?.items[0].extras[0].extraId).toBe(extra.id);
      expect(state.currentOrder?.items[0].extras[0].quantity).toBe(2);
    });

    it('should calculate correct subtotal without extras', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem({ price: '10.00' }), 2);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].subtotal).toBe(20);
    });

    it('should calculate correct subtotal with extras', () => {
      const extra = createMockExtra({ actualPrice: '2.00' });
      useOrderStore.getState().setAvailableExtras([extra]);
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore
        .getState()
        .addItem(createMockMenuItem({ price: '10.00' }), 2, '', [
          { extraId: extra.id, quantity: 1 },
        ]);

      const state = useOrderStore.getState();
      // (10 + 2) * 2 = 24
      expect(state.currentOrder?.items[0].subtotal).toBe(24);
    });

    it('should initialize order if not exists', () => {
      useOrderStore.getState().addItem(createMockMenuItem());

      const state = useOrderStore.getState();
      expect(state.currentOrder).not.toBeNull();
      expect(state.currentOrder?.items).toHaveLength(1);
    });

    it('should set isModified to true', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem());

      const state = useOrderStore.getState();
      expect(state.isModified).toBe(true);
    });

    it('should return unique item ID', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const id1 = useOrderStore.getState().addItem(createMockMenuItem());
      const id2 = useOrderStore.getState().addItem(createMockMenuItem());

      expect(id1).not.toBe(id2);
    });
  });

  describe('removeItem', () => {
    it('should remove item from order', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.getState().removeItem(itemId);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items).toHaveLength(0);
    });

    it('should not affect other items', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const id1 = useOrderStore.getState().addItem(createMockMenuItem({ id: 'item-1' }));
      const id2 = useOrderStore.getState().addItem(createMockMenuItem({ id: 'item-2' }));
      useOrderStore.getState().removeItem(id1);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items).toHaveLength(1);
      expect(state.currentOrder?.items[0].id).toBe(id2);
    });

    it('should handle non-existent item ID', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.getState().removeItem('non-existent');

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items).toHaveLength(1);
    });

    it('should set isModified to true', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      // Reset modified flag
      useOrderStore.setState({ isModified: false });
      useOrderStore.getState().removeItem(itemId);

      const state = useOrderStore.getState();
      expect(state.isModified).toBe(true);
    });

    it('should not change state if no order exists', () => {
      useOrderStore.getState().removeItem('some-id');
      const state = useOrderStore.getState();
      expect(state.currentOrder).toBeNull();
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.getState().updateItemQuantity(itemId, 5);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].quantity).toBe(5);
    });

    it('should clamp quantity to MIN_QUANTITY', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.getState().updateItemQuantity(itemId, 0);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].quantity).toBe(MIN_QUANTITY);
    });

    it('should clamp quantity to MAX_QUANTITY', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.getState().updateItemQuantity(itemId, 200);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].quantity).toBe(MAX_QUANTITY);
    });

    it('should recalculate subtotal', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem({ price: '10.00' }));
      useOrderStore.getState().updateItemQuantity(itemId, 3);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].subtotal).toBe(30);
    });

    it('should set isModified to true', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.setState({ isModified: false });
      useOrderStore.getState().updateItemQuantity(itemId, 2);

      const state = useOrderStore.getState();
      expect(state.isModified).toBe(true);
    });
  });

  describe('updateItemNotes', () => {
    it('should update item notes', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.getState().updateItemNotes(itemId, 'New note');

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].notes).toBe('New note');
    });

    it('should truncate long notes', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      const longNotes = 'a'.repeat(600);
      useOrderStore.getState().updateItemNotes(itemId, longNotes);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].notes.length).toBe(MAX_NOTES_LENGTH);
    });

    it('should set isModified to true', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.setState({ isModified: false });
      useOrderStore.getState().updateItemNotes(itemId, 'Note');

      const state = useOrderStore.getState();
      expect(state.isModified).toBe(true);
    });
  });

  describe('updateItemExtras', () => {
    it('should update item extras', () => {
      const extra = createMockExtra();
      useOrderStore.getState().setAvailableExtras([extra]);
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.getState().updateItemExtras(itemId, [{ extraId: extra.id, quantity: 2 }]);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].extras).toHaveLength(1);
      expect(state.currentOrder?.items[0].extras[0].quantity).toBe(2);
    });

    it('should recalculate subtotal', () => {
      const extra = createMockExtra({ actualPrice: '3.00' });
      useOrderStore.getState().setAvailableExtras([extra]);
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem({ price: '10.00' }));
      useOrderStore.getState().updateItemExtras(itemId, [{ extraId: extra.id, quantity: 1 }]);

      const state = useOrderStore.getState();
      // (10 + 3) * 1 = 13
      expect(state.currentOrder?.items[0].subtotal).toBe(13);
    });

    it('should set isModified to true', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.setState({ isModified: false });
      useOrderStore.getState().updateItemExtras(itemId, []);

      const state = useOrderStore.getState();
      expect(state.isModified).toBe(true);
    });
  });

  describe('updateItem', () => {
    it('should update multiple fields at once', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.getState().updateItem(itemId, {
        quantity: 5,
        notes: 'Updated note',
      });

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].quantity).toBe(5);
      expect(state.currentOrder?.items[0].notes).toBe('Updated note');
    });

    it('should only update specified fields', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem(), 2, 'Original note');
      useOrderStore.getState().updateItem(itemId, { quantity: 3 });

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].quantity).toBe(3);
      expect(state.currentOrder?.items[0].notes).toBe('Original note');
    });

    it('should recalculate subtotal', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem({ price: '10.00' }));
      useOrderStore.getState().updateItem(itemId, { quantity: 4 });

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].subtotal).toBe(40);
    });
  });

  describe('duplicateItem', () => {
    it('should create a duplicate of the item', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const originalId = useOrderStore.getState().addItem(createMockMenuItem(), 2, 'Note');
      const duplicateId = useOrderStore.getState().duplicateItem(originalId);

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items).toHaveLength(2);
      expect(duplicateId).not.toBe(originalId);
    });

    it('should copy all properties except ID', () => {
      const extra = createMockExtra();
      useOrderStore.getState().setAvailableExtras([extra]);
      useOrderStore.getState().initializeOrder('table-1');
      const originalId = useOrderStore
        .getState()
        .addItem(createMockMenuItem(), 3, 'Special request', [{ extraId: extra.id, quantity: 1 }]);
      const duplicateId = useOrderStore.getState().duplicateItem(originalId);

      const state = useOrderStore.getState();
      const original = state.currentOrder?.items.find((i) => i.id === originalId);
      const duplicate = state.currentOrder?.items.find((i) => i.id === duplicateId);

      expect(duplicate?.menuItemId).toBe(original?.menuItemId);
      expect(duplicate?.quantity).toBe(original?.quantity);
      expect(duplicate?.notes).toBe(original?.notes);
      expect(duplicate?.extras).toEqual(original?.extras);
      expect(duplicate?.subtotal).toBe(original?.subtotal);
    });

    it('should return null if item not found', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const result = useOrderStore.getState().duplicateItem('non-existent');
      expect(result).toBeNull();
    });

    it('should return null if no order exists', () => {
      const result = useOrderStore.getState().duplicateItem('some-id');
      expect(result).toBeNull();
    });

    it('should set isModified to true', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.setState({ isModified: false });
      useOrderStore.getState().duplicateItem(itemId);

      const state = useOrderStore.getState();
      expect(state.isModified).toBe(true);
    });
  });

  describe('setAvailableExtras', () => {
    it('should set available extras', () => {
      const extras = [createMockExtra({ id: 'e1' }), createMockExtra({ id: 'e2' })];
      useOrderStore.getState().setAvailableExtras(extras);

      const state = useOrderStore.getState();
      expect(state.availableExtras).toHaveLength(2);
      expect(state.availableExtras[0].id).toBe('e1');
    });
  });

  describe('getItemById', () => {
    it('should return item by ID', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem());

      const item = useOrderStore.getState().getItemById(itemId);
      expect(item).toBeDefined();
      expect(item?.id).toBe(itemId);
    });

    it('should return undefined for non-existent ID', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const item = useOrderStore.getState().getItemById('non-existent');
      expect(item).toBeUndefined();
    });

    it('should return undefined if no order exists', () => {
      const item = useOrderStore.getState().getItemById('some-id');
      expect(item).toBeUndefined();
    });
  });

  describe('getItemsByMenuItemId', () => {
    it('should return all items with matching menuItemId', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem({ id: 'menu-1' }));
      useOrderStore.getState().addItem(createMockMenuItem({ id: 'menu-1' }));
      useOrderStore.getState().addItem(createMockMenuItem({ id: 'menu-2' }));

      const items = useOrderStore.getState().getItemsByMenuItemId('menu-1');
      expect(items).toHaveLength(2);
    });

    it('should return empty array if no matches', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const items = useOrderStore.getState().getItemsByMenuItemId('non-existent');
      expect(items).toEqual([]);
    });

    it('should return empty array if no order exists', () => {
      const items = useOrderStore.getState().getItemsByMenuItemId('menu-1');
      expect(items).toEqual([]);
    });
  });

  describe('getItemQuantityByMenuItemId', () => {
    it('should return total quantity for menuItemId', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem({ id: 'menu-1' }), 2);
      useOrderStore.getState().addItem(createMockMenuItem({ id: 'menu-1' }), 3);

      const quantity = useOrderStore.getState().getItemQuantityByMenuItemId('menu-1');
      expect(quantity).toBe(5);
    });

    it('should return 0 if no matches', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const quantity = useOrderStore.getState().getItemQuantityByMenuItemId('non-existent');
      expect(quantity).toBe(0);
    });

    it('should return 0 if no order exists', () => {
      const quantity = useOrderStore.getState().getItemQuantityByMenuItemId('menu-1');
      expect(quantity).toBe(0);
    });
  });

  describe('getOrderTotal', () => {
    it('should return sum of all item subtotals', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem({ price: '10.00' }), 2);
      useOrderStore.getState().addItem(createMockMenuItem({ price: '15.00' }), 1);

      const total = useOrderStore.getState().getOrderTotal();
      expect(total).toBe(35);
    });

    it('should return 0 for empty order', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const total = useOrderStore.getState().getOrderTotal();
      expect(total).toBe(0);
    });

    it('should return 0 if no order exists', () => {
      const total = useOrderStore.getState().getOrderTotal();
      expect(total).toBe(0);
    });
  });

  describe('getItemCount', () => {
    it('should return number of items', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.getState().addItem(createMockMenuItem());

      const count = useOrderStore.getState().getItemCount();
      expect(count).toBe(2);
    });

    it('should return 0 for empty order', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const count = useOrderStore.getState().getItemCount();
      expect(count).toBe(0);
    });

    it('should return 0 if no order exists', () => {
      const count = useOrderStore.getState().getItemCount();
      expect(count).toBe(0);
    });
  });

  describe('getTotalQuantity', () => {
    it('should return sum of all quantities', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem(), 2);
      useOrderStore.getState().addItem(createMockMenuItem(), 3);

      const quantity = useOrderStore.getState().getTotalQuantity();
      expect(quantity).toBe(5);
    });

    it('should return 0 for empty order', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const quantity = useOrderStore.getState().getTotalQuantity();
      expect(quantity).toBe(0);
    });

    it('should return 0 if no order exists', () => {
      const quantity = useOrderStore.getState().getTotalQuantity();
      expect(quantity).toBe(0);
    });
  });

  describe('hasItems', () => {
    it('should return true if order has items', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem());

      const hasItems = useOrderStore.getState().hasItems();
      expect(hasItems).toBe(true);
    });

    it('should return false for empty order', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const hasItems = useOrderStore.getState().hasItems();
      expect(hasItems).toBe(false);
    });

    it('should return false if no order exists', () => {
      const hasItems = useOrderStore.getState().hasItems();
      expect(hasItems).toBe(false);
    });
  });

  describe('recalculateSubtotals', () => {
    it('should recalculate all item subtotals', () => {
      useOrderStore.getState().initializeOrder('table-1');
      const itemId = useOrderStore.getState().addItem(createMockMenuItem({ price: '10.00' }));

      // Manually modify the subtotal to simulate a bug
      useOrderStore.setState((state) => ({
        currentOrder: state.currentOrder
          ? {
              ...state.currentOrder,
              items: state.currentOrder.items.map((item) =>
                item.id === itemId ? { ...item, subtotal: 999 } : item
              ),
            }
          : null,
      }));

      useOrderStore.getState().recalculateSubtotals();

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items[0].subtotal).toBe(10);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem());
      useOrderStore.getState().setAvailableExtras([createMockExtra()]);

      useOrderStore.getState().reset();

      const state = useOrderStore.getState();
      expect(state.currentOrder).toBeNull();
      expect(state.availableExtras).toEqual([]);
      expect(state.isModified).toBe(false);
      expect(state.lastModifiedAt).toBeNull();
    });
  });
});

// ============================================================================
// Custom Hooks Tests
// ============================================================================

describe('Order Store Custom Hooks', () => {
  beforeEach(() => {
    useOrderStore.getState().reset();
  });

  describe('useCurrentOrder', () => {
    it('should return current order', () => {
      useOrderStore.getState().initializeOrder('table-1');

      const { result } = renderHook(() => useCurrentOrder());
      expect(result.current).not.toBeNull();
      expect(result.current?.tableId).toBe('table-1');
    });

    it('should return null when no order', () => {
      const { result } = renderHook(() => useCurrentOrder());
      expect(result.current).toBeNull();
    });
  });

  describe('useOrderItems', () => {
    it('should return order items array', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem());

      const { result } = renderHook(() => useOrderItems());
      expect(result.current).toHaveLength(1);
    });

    it('should return empty array when no order', () => {
      const { result } = renderHook(() => useOrderItems());
      expect(result.current).toEqual([]);
    });
  });

  describe('useOrderTableId', () => {
    it('should return table ID', () => {
      useOrderStore.getState().initializeOrder('table-123');

      const { result } = renderHook(() => useOrderTableId());
      expect(result.current).toBe('table-123');
    });

    it('should return empty string when no order', () => {
      const { result } = renderHook(() => useOrderTableId());
      expect(result.current).toBe('');
    });
  });

  describe('useOrderNotes', () => {
    it('should return order notes', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().setOrderNotes('Test notes');

      const { result } = renderHook(() => useOrderNotes());
      expect(result.current).toBe('Test notes');
    });

    it('should return empty string when no order', () => {
      const { result } = renderHook(() => useOrderNotes());
      expect(result.current).toBe('');
    });
  });

  describe('useAvailableExtras', () => {
    it('should return available extras', () => {
      const extras = [createMockExtra()];
      useOrderStore.getState().setAvailableExtras(extras);

      const { result } = renderHook(() => useAvailableExtras());
      expect(result.current).toHaveLength(1);
    });
  });

  describe('useOrderModified', () => {
    it('should return modification state', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem());

      const { result } = renderHook(() => useOrderModified());
      expect(result.current.isModified).toBe(true);
      expect(result.current.lastModifiedAt).not.toBeNull();
    });
  });

  describe('useOrderTotals', () => {
    it('should return order totals', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem({ price: '10.00' }), 2);
      useOrderStore.getState().addItem(createMockMenuItem({ price: '5.00' }), 3);

      const { result } = renderHook(() => useOrderTotals());
      expect(result.current.total).toBe(35);
      expect(result.current.itemCount).toBe(2);
      expect(result.current.totalQuantity).toBe(5);
      expect(result.current.hasItems).toBe(true);
    });

    it('should return zeros when no order', () => {
      const { result } = renderHook(() => useOrderTotals());
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.totalQuantity).toBe(0);
      expect(result.current.hasItems).toBe(false);
    });
  });

  describe('useMenuItemQuantityInOrder', () => {
    it('should return quantity for specific menu item', () => {
      useOrderStore.getState().initializeOrder('table-1');
      useOrderStore.getState().addItem(createMockMenuItem({ id: 'menu-1' }), 3);
      useOrderStore.getState().addItem(createMockMenuItem({ id: 'menu-1' }), 2);

      const { result } = renderHook(() => useMenuItemQuantityInOrder('menu-1'));
      expect(result.current).toBe(5);
    });

    it('should return 0 for non-existent menu item', () => {
      useOrderStore.getState().initializeOrder('table-1');

      const { result } = renderHook(() => useMenuItemQuantityInOrder('non-existent'));
      expect(result.current).toBe(0);
    });
  });

  describe('useOrderActions', () => {
    it('should return all order actions', () => {
      const { result } = renderHook(() => useOrderActions());

      expect(result.current.initializeOrder).toBeDefined();
      expect(result.current.clearOrder).toBeDefined();
      expect(result.current.setOrderNotes).toBeDefined();
      expect(result.current.addItem).toBeDefined();
      expect(result.current.removeItem).toBeDefined();
      expect(result.current.updateItemQuantity).toBeDefined();
      expect(result.current.updateItemNotes).toBeDefined();
      expect(result.current.updateItemExtras).toBeDefined();
      expect(result.current.updateItem).toBeDefined();
      expect(result.current.duplicateItem).toBeDefined();
      expect(result.current.setAvailableExtras).toBeDefined();
      expect(result.current.recalculateSubtotals).toBeDefined();
      expect(result.current.reset).toBeDefined();
    });

    it('should work with actions', () => {
      const { result } = renderHook(() => useOrderActions());

      act(() => {
        result.current.initializeOrder('table-1');
        result.current.addItem(createMockMenuItem());
      });

      const state = useOrderStore.getState();
      expect(state.currentOrder?.items).toHaveLength(1);
    });
  });
});

// ============================================================================
// Export Tests
// ============================================================================

describe('Order Store Exports', () => {
  it('should export useOrderStore', () => {
    expect(useOrderStore).toBeDefined();
  });

  it('should export constants', () => {
    expect(MIN_QUANTITY).toBe(1);
    expect(MAX_QUANTITY).toBe(99);
    expect(MAX_NOTES_LENGTH).toBe(500);
  });

  it('should export helper functions', () => {
    expect(generateLocalId).toBeDefined();
    expect(parsePrice).toBeDefined();
    expect(formatPrice).toBeDefined();
    expect(getFormattedPrice).toBeDefined();
    expect(clampQuantity).toBeDefined();
    expect(truncateNotes).toBeDefined();
    expect(calculateSelectedExtrasTotal).toBeDefined();
    expect(calculateExtrasTotal).toBeDefined();
    expect(calculateItemSubtotal).toBeDefined();
    expect(convertToOrderItemExtras).toBeDefined();
  });

  it('should export custom hooks', () => {
    expect(useCurrentOrder).toBeDefined();
    expect(useOrderItems).toBeDefined();
    expect(useOrderTableId).toBeDefined();
    expect(useOrderNotes).toBeDefined();
    expect(useAvailableExtras).toBeDefined();
    expect(useOrderModified).toBeDefined();
    expect(useOrderTotals).toBeDefined();
    expect(useMenuItemQuantityInOrder).toBeDefined();
    expect(useOrderActions).toBeDefined();
  });
});

// ============================================================================
// Stores Index Export Tests
// ============================================================================

describe('Stores Index Exports', () => {
  it('should export all order store types and functions from index', async () => {
    const stores = await import('../stores');

    // Types (these are type-only exports, so we check the functions)
    expect(stores.useOrderStore).toBeDefined();

    // Constants
    expect(stores.MIN_QUANTITY).toBe(1);
    expect(stores.MAX_QUANTITY).toBe(99);
    expect(stores.MAX_NOTES_LENGTH).toBe(500);

    // Helper functions
    expect(stores.generateLocalId).toBeDefined();
    expect(stores.parsePrice).toBeDefined();
    expect(stores.formatPrice).toBeDefined();
    expect(stores.getFormattedPrice).toBeDefined();
    expect(stores.clampQuantity).toBeDefined();
    expect(stores.truncateNotes).toBeDefined();
    expect(stores.calculateSelectedExtrasTotal).toBeDefined();
    expect(stores.calculateExtrasTotal).toBeDefined();
    expect(stores.calculateItemSubtotal).toBeDefined();
    expect(stores.convertToOrderItemExtras).toBeDefined();

    // Custom hooks
    expect(stores.useCurrentOrder).toBeDefined();
    expect(stores.useOrderItems).toBeDefined();
    expect(stores.useOrderTableId).toBeDefined();
    expect(stores.useOrderNotes).toBeDefined();
    expect(stores.useAvailableExtras).toBeDefined();
    expect(stores.useOrderModified).toBeDefined();
    expect(stores.useOrderTotals).toBeDefined();
    expect(stores.useMenuItemQuantityInOrder).toBeDefined();
    expect(stores.useOrderActions).toBeDefined();
  });
});
