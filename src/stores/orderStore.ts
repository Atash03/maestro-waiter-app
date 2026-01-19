/**
 * Order Store
 *
 * Zustand store for managing local order state before sending to API.
 * Features:
 * - Add item to order (local state first)
 * - Edit item quantity and notes
 * - Remove item from order
 * - Duplicate item with same customizations
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Extra, MenuItem, OrderItemExtra, Translation } from '../types/models';

// ============================================================================
// Types
// ============================================================================

/**
 * Selected extra with quantity for local order item
 */
export interface SelectedExtra {
  extraId: string;
  quantity: number;
  title?: Translation;
  price?: string;
}

/**
 * Order item in the local order state (before sending to API)
 */
export interface LocalOrderItem {
  id: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  notes: string;
  extras: OrderItemExtra[];
  unitPrice: number;
  subtotal: number;
}

/**
 * Local order state
 */
export interface LocalOrder {
  tableId: string;
  items: LocalOrderItem[];
  notes: string;
}

/**
 * Order store state and actions
 */
export interface OrderState {
  // State
  currentOrder: LocalOrder | null;
  availableExtras: Extra[];
  isModified: boolean;
  lastModifiedAt: number | null;

  // Order lifecycle actions
  initializeOrder: (tableId: string) => void;
  clearOrder: () => void;
  setOrderNotes: (notes: string) => void;

  // Item management actions
  addItem: (
    menuItem: MenuItem,
    quantity?: number,
    notes?: string,
    extras?: SelectedExtra[]
  ) => string;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  updateItemExtras: (itemId: string, extras: SelectedExtra[]) => void;
  updateItem: (
    itemId: string,
    updates: Partial<Pick<LocalOrderItem, 'quantity' | 'notes' | 'extras'>>
  ) => void;
  duplicateItem: (itemId: string) => string | null;

  // Extras management
  setAvailableExtras: (extras: Extra[]) => void;

  // Selectors (computed getters)
  getItemById: (itemId: string) => LocalOrderItem | undefined;
  getItemsByMenuItemId: (menuItemId: string) => LocalOrderItem[];
  getItemQuantityByMenuItemId: (menuItemId: string) => number;
  getOrderTotal: () => number;
  getItemCount: () => number;
  getTotalQuantity: () => number;
  hasItems: () => boolean;

  // Utility actions
  recalculateSubtotals: () => void;
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;
export const MAX_NOTES_LENGTH = 500;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique local ID for order items
 */
export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parse price string to number
 */
export function parsePrice(price: string | undefined): number {
  if (!price) return 0;
  const parsed = Number.parseFloat(price);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Format price for display with 2 decimal places
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}

/**
 * Get formatted price with currency symbol
 */
export function getFormattedPrice(price: number | string | undefined): string {
  const numPrice = typeof price === 'number' ? price : parsePrice(price as string);
  return `$${formatPrice(numPrice)}`;
}

/**
 * Calculate extras total for selected extras
 */
export function calculateSelectedExtrasTotal(
  selectedExtras: SelectedExtra[],
  availableExtras: Extra[]
): number {
  return selectedExtras.reduce((total, selected) => {
    const extra = availableExtras.find((e) => e.id === selected.extraId);
    if (extra) {
      return total + parsePrice(extra.actualPrice) * selected.quantity;
    }
    // Fallback to price from SelectedExtra if available
    if (selected.price) {
      return total + parsePrice(selected.price) * selected.quantity;
    }
    return total;
  }, 0);
}

/**
 * Calculate extras total from OrderItemExtra array
 */
export function calculateExtrasTotal(extras: OrderItemExtra[], availableExtras: Extra[]): number {
  return extras.reduce((total, orderExtra) => {
    const extra = availableExtras.find((e) => e.id === orderExtra.extraId);
    if (extra) {
      return total + parsePrice(extra.actualPrice) * orderExtra.quantity;
    }
    // Fallback to price from OrderItemExtra if available
    if (orderExtra.price) {
      return total + parsePrice(orderExtra.price) * orderExtra.quantity;
    }
    return total;
  }, 0);
}

/**
 * Calculate order item subtotal including extras
 */
export function calculateItemSubtotal(
  unitPrice: number,
  quantity: number,
  extras: OrderItemExtra[],
  availableExtras: Extra[]
): number {
  const basePrice = unitPrice * quantity;
  const extrasPrice = calculateExtrasTotal(extras, availableExtras) * quantity;
  return basePrice + extrasPrice;
}

/**
 * Convert SelectedExtra array to OrderItemExtra array
 */
export function convertToOrderItemExtras(
  selectedExtras: SelectedExtra[],
  availableExtras: Extra[]
): OrderItemExtra[] {
  return selectedExtras.map((selected) => {
    const extra = availableExtras.find((e) => e.id === selected.extraId);
    return {
      extraId: selected.extraId,
      quantity: selected.quantity,
      title: extra?.title ?? selected.title,
      price: extra?.actualPrice ?? selected.price,
    };
  });
}

/**
 * Clamp quantity to valid range
 */
export function clampQuantity(quantity: number): number {
  return Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, Math.round(quantity)));
}

/**
 * Truncate notes to max length
 */
export function truncateNotes(notes: string): string {
  return notes.substring(0, MAX_NOTES_LENGTH);
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: Pick<
  OrderState,
  'currentOrder' | 'availableExtras' | 'isModified' | 'lastModifiedAt'
> = {
  currentOrder: null,
  availableExtras: [],
  isModified: false,
  lastModifiedAt: null,
};

// ============================================================================
// Store Creation
// ============================================================================

export const useOrderStore = create<OrderState>((set, get) => ({
  // Initial state
  ...initialState,

  // ============================================================================
  // Order Lifecycle Actions
  // ============================================================================

  initializeOrder: (tableId: string) => {
    set({
      currentOrder: {
        tableId,
        items: [],
        notes: '',
      },
      isModified: false,
      lastModifiedAt: Date.now(),
    });
  },

  clearOrder: () => {
    set({
      currentOrder: null,
      isModified: false,
      lastModifiedAt: null,
    });
  },

  setOrderNotes: (notes: string) => {
    set((state) => {
      if (!state.currentOrder) return state;
      return {
        currentOrder: {
          ...state.currentOrder,
          notes: truncateNotes(notes),
        },
        isModified: true,
        lastModifiedAt: Date.now(),
      };
    });
  },

  // ============================================================================
  // Item Management Actions
  // ============================================================================

  addItem: (menuItem: MenuItem, quantity = 1, notes = '', extras: SelectedExtra[] = []) => {
    const id = generateLocalId();
    const { availableExtras } = get();
    const unitPrice = parsePrice(menuItem.price);
    const orderItemExtras = convertToOrderItemExtras(extras, availableExtras);
    const clampedQuantity = clampQuantity(quantity);
    const subtotal = calculateItemSubtotal(
      unitPrice,
      clampedQuantity,
      orderItemExtras,
      availableExtras
    );

    set((state) => {
      // Initialize order if not exists (use empty tableId as placeholder)
      const currentOrder = state.currentOrder ?? {
        tableId: '',
        items: [],
        notes: '',
      };

      const newItem: LocalOrderItem = {
        id,
        menuItemId: menuItem.id,
        menuItem,
        quantity: clampedQuantity,
        notes: truncateNotes(notes),
        extras: orderItemExtras,
        unitPrice,
        subtotal,
      };

      return {
        currentOrder: {
          ...currentOrder,
          items: [...currentOrder.items, newItem],
        },
        isModified: true,
        lastModifiedAt: Date.now(),
      };
    });

    return id;
  },

  removeItem: (itemId: string) => {
    set((state) => {
      if (!state.currentOrder) return state;
      return {
        currentOrder: {
          ...state.currentOrder,
          items: state.currentOrder.items.filter((item) => item.id !== itemId),
        },
        isModified: true,
        lastModifiedAt: Date.now(),
      };
    });
  },

  updateItemQuantity: (itemId: string, quantity: number) => {
    const { availableExtras } = get();
    const clampedQuantity = clampQuantity(quantity);

    set((state) => {
      if (!state.currentOrder) return state;
      return {
        currentOrder: {
          ...state.currentOrder,
          items: state.currentOrder.items.map((item) => {
            if (item.id === itemId) {
              const subtotal = calculateItemSubtotal(
                item.unitPrice,
                clampedQuantity,
                item.extras,
                availableExtras
              );
              return { ...item, quantity: clampedQuantity, subtotal };
            }
            return item;
          }),
        },
        isModified: true,
        lastModifiedAt: Date.now(),
      };
    });
  },

  updateItemNotes: (itemId: string, notes: string) => {
    set((state) => {
      if (!state.currentOrder) return state;
      return {
        currentOrder: {
          ...state.currentOrder,
          items: state.currentOrder.items.map((item) => {
            if (item.id === itemId) {
              return { ...item, notes: truncateNotes(notes) };
            }
            return item;
          }),
        },
        isModified: true,
        lastModifiedAt: Date.now(),
      };
    });
  },

  updateItemExtras: (itemId: string, extras: SelectedExtra[]) => {
    const { availableExtras } = get();
    const orderItemExtras = convertToOrderItemExtras(extras, availableExtras);

    set((state) => {
      if (!state.currentOrder) return state;
      return {
        currentOrder: {
          ...state.currentOrder,
          items: state.currentOrder.items.map((item) => {
            if (item.id === itemId) {
              const subtotal = calculateItemSubtotal(
                item.unitPrice,
                item.quantity,
                orderItemExtras,
                availableExtras
              );
              return { ...item, extras: orderItemExtras, subtotal };
            }
            return item;
          }),
        },
        isModified: true,
        lastModifiedAt: Date.now(),
      };
    });
  },

  updateItem: (
    itemId: string,
    updates: Partial<Pick<LocalOrderItem, 'quantity' | 'notes' | 'extras'>>
  ) => {
    const { availableExtras } = get();

    set((state) => {
      if (!state.currentOrder) return state;
      return {
        currentOrder: {
          ...state.currentOrder,
          items: state.currentOrder.items.map((item) => {
            if (item.id === itemId) {
              const newQuantity =
                updates.quantity !== undefined ? clampQuantity(updates.quantity) : item.quantity;
              const newNotes =
                updates.notes !== undefined ? truncateNotes(updates.notes) : item.notes;
              const newExtras = updates.extras ?? item.extras;
              const subtotal = calculateItemSubtotal(
                item.unitPrice,
                newQuantity,
                newExtras,
                availableExtras
              );
              return {
                ...item,
                quantity: newQuantity,
                notes: newNotes,
                extras: newExtras,
                subtotal,
              };
            }
            return item;
          }),
        },
        isModified: true,
        lastModifiedAt: Date.now(),
      };
    });
  },

  duplicateItem: (itemId: string) => {
    const state = get();
    if (!state.currentOrder) return null;

    const itemToDuplicate = state.currentOrder.items.find((item) => item.id === itemId);
    if (!itemToDuplicate) return null;

    const newId = generateLocalId();
    const duplicatedItem: LocalOrderItem = {
      ...itemToDuplicate,
      id: newId,
    };

    set((state) => {
      if (!state.currentOrder) return state;
      return {
        currentOrder: {
          ...state.currentOrder,
          items: [...state.currentOrder.items, duplicatedItem],
        },
        isModified: true,
        lastModifiedAt: Date.now(),
      };
    });

    return newId;
  },

  // ============================================================================
  // Extras Management
  // ============================================================================

  setAvailableExtras: (extras: Extra[]) => {
    set({ availableExtras: extras });
  },

  // ============================================================================
  // Selectors (computed getters)
  // ============================================================================

  getItemById: (itemId: string) => {
    const { currentOrder } = get();
    if (!currentOrder) return undefined;
    return currentOrder.items.find((item) => item.id === itemId);
  },

  getItemsByMenuItemId: (menuItemId: string) => {
    const { currentOrder } = get();
    if (!currentOrder) return [];
    return currentOrder.items.filter((item) => item.menuItemId === menuItemId);
  },

  getItemQuantityByMenuItemId: (menuItemId: string) => {
    const { currentOrder } = get();
    if (!currentOrder) return 0;
    return currentOrder.items
      .filter((item) => item.menuItemId === menuItemId)
      .reduce((total, item) => total + item.quantity, 0);
  },

  getOrderTotal: () => {
    const { currentOrder } = get();
    if (!currentOrder) return 0;
    return currentOrder.items.reduce((total, item) => total + item.subtotal, 0);
  },

  getItemCount: () => {
    const { currentOrder } = get();
    if (!currentOrder) return 0;
    return currentOrder.items.length;
  },

  getTotalQuantity: () => {
    const { currentOrder } = get();
    if (!currentOrder) return 0;
    return currentOrder.items.reduce((total, item) => total + item.quantity, 0);
  },

  hasItems: () => {
    const { currentOrder } = get();
    return currentOrder !== null && currentOrder.items.length > 0;
  },

  // ============================================================================
  // Utility Actions
  // ============================================================================

  recalculateSubtotals: () => {
    const { availableExtras } = get();
    set((state) => {
      if (!state.currentOrder) return state;
      return {
        currentOrder: {
          ...state.currentOrder,
          items: state.currentOrder.items.map((item) => ({
            ...item,
            subtotal: calculateItemSubtotal(
              item.unitPrice,
              item.quantity,
              item.extras,
              availableExtras
            ),
          })),
        },
      };
    });
  },

  reset: () => {
    set(initialState);
  },
}));

// ============================================================================
// Custom Hooks for Optimized Selectors
// ============================================================================

/**
 * Get current order
 */
export function useCurrentOrder() {
  return useOrderStore((state) => state.currentOrder);
}

// Empty array constant for stable reference
const EMPTY_ORDER_ITEMS: LocalOrderItem[] = [];

/**
 * Get order items array
 */
export function useOrderItems() {
  return useOrderStore((state) => state.currentOrder?.items ?? EMPTY_ORDER_ITEMS);
}

/**
 * Get order table ID
 */
export function useOrderTableId() {
  return useOrderStore((state) => state.currentOrder?.tableId ?? '');
}

/**
 * Get order notes
 */
export function useOrderNotes() {
  return useOrderStore((state) => state.currentOrder?.notes ?? '');
}

/**
 * Get available extras
 */
export function useAvailableExtras() {
  return useOrderStore((state) => state.availableExtras);
}

/**
 * Get order modification state
 */
export function useOrderModified() {
  return useOrderStore(
    useShallow((state) => ({
      isModified: state.isModified,
      lastModifiedAt: state.lastModifiedAt,
    }))
  );
}

/**
 * Get order totals
 */
export function useOrderTotals() {
  return useOrderStore(
    useShallow((state) => ({
      total: state.getOrderTotal(),
      itemCount: state.getItemCount(),
      totalQuantity: state.getTotalQuantity(),
      hasItems: state.hasItems(),
    }))
  );
}

/**
 * Get quantity in order for a specific menu item
 */
export function useMenuItemQuantityInOrder(menuItemId: string) {
  return useOrderStore((state) => state.getItemQuantityByMenuItemId(menuItemId));
}

/**
 * Get all order item management actions
 */
export function useOrderActions() {
  return useOrderStore(
    useShallow((state) => ({
      initializeOrder: state.initializeOrder,
      clearOrder: state.clearOrder,
      setOrderNotes: state.setOrderNotes,
      addItem: state.addItem,
      removeItem: state.removeItem,
      updateItemQuantity: state.updateItemQuantity,
      updateItemNotes: state.updateItemNotes,
      updateItemExtras: state.updateItemExtras,
      updateItem: state.updateItem,
      duplicateItem: state.duplicateItem,
      setAvailableExtras: state.setAvailableExtras,
      recalculateSubtotals: state.recalculateSubtotals,
      reset: state.reset,
    }))
  );
}
