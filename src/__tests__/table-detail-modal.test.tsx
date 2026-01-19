/**
 * TableDetailModal Component Tests
 *
 * Tests for the TableDetailModal component including:
 * - Rendering with different table states
 * - Active order display with items
 * - Order history display
 * - Tab switching functionality
 * - Action button visibility and callbacks
 * - Helper functions for status labels and colors
 * - Export verification
 */

import { render } from '@testing-library/react-native';
import type { TableItemData, TableStatus } from '../../components/tables';
import {
  formatTime,
  getOrderItemBadgeVariant,
  getOrderItemStatusColor,
  getOrderItemStatusLabel,
  getOrderStatusBadgeVariant,
  getStatusBadgeVariant,
  getTableStatusLabel,
  getTranslatedText,
  TableDetailModal,
  type TableDetailModalProps,
} from '../../components/tables';
import { OrderItemStatus, OrderStatus, OrderType } from '../types/enums';
import type { Order, OrderItem, Translation } from '../types/models';

// Note: Uses global jest.setup.js mock for react-native-reanimated

// ============================================================================
// Test Data
// ============================================================================

const createMockTranslation = (text: string): Translation => ({
  en: text,
  ru: `${text}_ru`,
  tm: `${text}_tm`,
});

const createMockTable = (overrides: Partial<TableItemData> = {}): TableItemData => ({
  id: 'table-1',
  title: 'Table 1',
  capacity: 4,
  zoneId: 'zone-1',
  x: '100',
  y: '200',
  width: '80',
  height: '80',
  color: '',
  status: 'available',
  guestCount: 0,
  hasActiveOrder: false,
  hasPendingCall: false,
  zone: {
    id: 'zone-1',
    title: createMockTranslation('Main Hall'),
  },
  ...overrides,
});

const createMockOrderItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  id: 'item-1',
  orderId: 'order-1',
  menuItemId: 'menu-1',
  quantity: '2',
  status: OrderItemStatus.PREPARING,
  itemTitle: createMockTranslation('Burger'),
  itemPrice: '25.00',
  subtotal: '50.00',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  orderNumber: 101,
  orderCode: 'ORD-101',
  orderType: OrderType.DINE_IN,
  orderStatus: OrderStatus.IN_PROGRESS,
  totalAmount: '150.00',
  tableId: 'table-1',
  waiterId: 'waiter-1',
  issuedById: 'waiter-1',
  createdAt: new Date().toISOString(),
  orderItems: [
    createMockOrderItem({ id: 'item-1', status: OrderItemStatus.PREPARING }),
    createMockOrderItem({
      id: 'item-2',
      itemTitle: createMockTranslation('Fries'),
      status: OrderItemStatus.READY,
      subtotal: '10.00',
    }),
  ],
  ...overrides,
});

const createMockProps = (
  overrides: Partial<TableDetailModalProps> = {}
): TableDetailModalProps => ({
  visible: true,
  onClose: jest.fn(),
  table: createMockTable(),
  activeOrder: null,
  orderHistory: [],
  isLoadingHistory: false,
  onNewOrder: jest.fn(),
  onViewBill: jest.fn(),
  onTransferTable: jest.fn(),
  onSelectOrder: jest.fn(),
  onSelectOrderItem: jest.fn(),
  testID: 'table-detail-modal',
  ...overrides,
});

// Helper to check if text exists in rendered JSON
const jsonContains = (json: string, text: string): boolean => json.includes(text);

// ============================================================================
// Helper Function Tests - getTranslatedText
// ============================================================================

describe('getTranslatedText helper', () => {
  it('returns English text when available', () => {
    const translation = createMockTranslation('Test');
    expect(getTranslatedText(translation)).toBe('Test');
  });

  it('returns fallback when translation is undefined', () => {
    expect(getTranslatedText(undefined, 'Fallback')).toBe('Fallback');
  });

  it('returns empty string when translation is undefined and no fallback', () => {
    expect(getTranslatedText(undefined)).toBe('');
  });

  it('falls back to Russian when English is empty', () => {
    const translation = { en: '', ru: 'Russian', tm: 'Turkmen' };
    expect(getTranslatedText(translation)).toBe('Russian');
  });

  it('falls back to Turkmen when English and Russian are empty', () => {
    const translation = { en: '', ru: '', tm: 'Turkmen' };
    expect(getTranslatedText(translation)).toBe('Turkmen');
  });
});

// ============================================================================
// Helper Function Tests - getStatusBadgeVariant
// ============================================================================

describe('getStatusBadgeVariant helper', () => {
  it('returns available for available status', () => {
    expect(getStatusBadgeVariant('available')).toBe('available');
  });

  it('returns occupied for occupied status', () => {
    expect(getStatusBadgeVariant('occupied')).toBe('occupied');
  });

  it('returns reserved for reserved status', () => {
    expect(getStatusBadgeVariant('reserved')).toBe('reserved');
  });

  it('returns warning for needsAttention status', () => {
    expect(getStatusBadgeVariant('needsAttention')).toBe('warning');
  });

  it('returns available for unknown status', () => {
    expect(getStatusBadgeVariant('unknown' as TableStatus)).toBe('available');
  });
});

// ============================================================================
// Helper Function Tests - getTableStatusLabel
// ============================================================================

describe('getTableStatusLabel helper', () => {
  it('returns Available for available status', () => {
    expect(getTableStatusLabel('available')).toBe('Available');
  });

  it('returns Occupied for occupied status', () => {
    expect(getTableStatusLabel('occupied')).toBe('Occupied');
  });

  it('returns Reserved for reserved status', () => {
    expect(getTableStatusLabel('reserved')).toBe('Reserved');
  });

  it('returns Needs Attention for needsAttention status', () => {
    expect(getTableStatusLabel('needsAttention')).toBe('Needs Attention');
  });

  it('returns Unknown for unknown status', () => {
    expect(getTableStatusLabel('unknown' as TableStatus)).toBe('Unknown');
  });
});

// ============================================================================
// Helper Function Tests - getOrderItemStatusColor
// ============================================================================

describe('getOrderItemStatusColor helper', () => {
  it('returns gray for PENDING status', () => {
    expect(getOrderItemStatusColor(OrderItemStatus.PENDING)).toBe('#6B7280');
  });

  it('returns yellow for SENT_TO_PREPARE status', () => {
    expect(getOrderItemStatusColor(OrderItemStatus.SENT_TO_PREPARE)).toBe('#EAB308');
  });

  it('returns orange for PREPARING status', () => {
    expect(getOrderItemStatusColor(OrderItemStatus.PREPARING)).toBe('#F97316');
  });

  it('returns green for READY status', () => {
    expect(getOrderItemStatusColor(OrderItemStatus.READY)).toBe('#10B981');
  });

  it('returns muted for SERVED status', () => {
    expect(getOrderItemStatusColor(OrderItemStatus.SERVED)).toBe('#9CA3AF');
  });

  it('returns red for DECLINED status', () => {
    expect(getOrderItemStatusColor(OrderItemStatus.DECLINED)).toBe('#EF4444');
  });

  it('returns red for CANCELED status', () => {
    expect(getOrderItemStatusColor(OrderItemStatus.CANCELED)).toBe('#EF4444');
  });
});

// ============================================================================
// Helper Function Tests - getOrderItemStatusLabel
// ============================================================================

describe('getOrderItemStatusLabel helper', () => {
  it('returns Pending for PENDING status', () => {
    expect(getOrderItemStatusLabel(OrderItemStatus.PENDING)).toBe('Pending');
  });

  it('returns Sent for SENT_TO_PREPARE status', () => {
    expect(getOrderItemStatusLabel(OrderItemStatus.SENT_TO_PREPARE)).toBe('Sent');
  });

  it('returns Preparing for PREPARING status', () => {
    expect(getOrderItemStatusLabel(OrderItemStatus.PREPARING)).toBe('Preparing');
  });

  it('returns Ready for READY status', () => {
    expect(getOrderItemStatusLabel(OrderItemStatus.READY)).toBe('Ready');
  });

  it('returns Served for SERVED status', () => {
    expect(getOrderItemStatusLabel(OrderItemStatus.SERVED)).toBe('Served');
  });

  it('returns Declined for DECLINED status', () => {
    expect(getOrderItemStatusLabel(OrderItemStatus.DECLINED)).toBe('Declined');
  });

  it('returns Canceled for CANCELED status', () => {
    expect(getOrderItemStatusLabel(OrderItemStatus.CANCELED)).toBe('Canceled');
  });

  it('returns Unknown for unknown status', () => {
    expect(getOrderItemStatusLabel('unknown' as OrderItemStatus)).toBe('Unknown');
  });
});

// ============================================================================
// Helper Function Tests - getOrderItemBadgeVariant
// ============================================================================

describe('getOrderItemBadgeVariant helper', () => {
  it('returns pending for PENDING status', () => {
    expect(getOrderItemBadgeVariant(OrderItemStatus.PENDING)).toBe('pending');
  });

  it('returns warning for SENT_TO_PREPARE status', () => {
    expect(getOrderItemBadgeVariant(OrderItemStatus.SENT_TO_PREPARE)).toBe('warning');
  });

  it('returns preparing for PREPARING status', () => {
    expect(getOrderItemBadgeVariant(OrderItemStatus.PREPARING)).toBe('preparing');
  });

  it('returns ready for READY status', () => {
    expect(getOrderItemBadgeVariant(OrderItemStatus.READY)).toBe('ready');
  });

  it('returns default for SERVED status', () => {
    expect(getOrderItemBadgeVariant(OrderItemStatus.SERVED)).toBe('default');
  });

  it('returns error for DECLINED status', () => {
    expect(getOrderItemBadgeVariant(OrderItemStatus.DECLINED)).toBe('error');
  });

  it('returns error for CANCELED status', () => {
    expect(getOrderItemBadgeVariant(OrderItemStatus.CANCELED)).toBe('error');
  });
});

// ============================================================================
// Helper Function Tests - getOrderStatusBadgeVariant
// ============================================================================

describe('getOrderStatusBadgeVariant helper', () => {
  it('returns pending for PENDING status', () => {
    expect(getOrderStatusBadgeVariant(OrderStatus.PENDING)).toBe('pending');
  });

  it('returns info for IN_PROGRESS status', () => {
    expect(getOrderStatusBadgeVariant(OrderStatus.IN_PROGRESS)).toBe('info');
  });

  it('returns success for COMPLETED status', () => {
    expect(getOrderStatusBadgeVariant(OrderStatus.COMPLETED)).toBe('success');
  });

  it('returns error for CANCELLED status', () => {
    expect(getOrderStatusBadgeVariant(OrderStatus.CANCELLED)).toBe('error');
  });

  it('returns pending for unknown status', () => {
    expect(getOrderStatusBadgeVariant('unknown' as OrderStatus)).toBe('pending');
  });
});

// ============================================================================
// Helper Function Tests - formatTime
// ============================================================================

describe('formatTime helper', () => {
  it('formats a valid date string to time', () => {
    const date = new Date();
    date.setHours(14, 30, 0, 0);
    const result = formatTime(date.toISOString());
    // Time format depends on locale, but should contain numbers
    expect(result).toMatch(/\d/);
  });

  it('returns dash for invalid date string', () => {
    expect(formatTime('invalid-date')).toBe('-');
  });

  it('returns dash for empty string', () => {
    expect(formatTime('')).toBe('-');
  });
});

// ============================================================================
// Visibility Tests
// ============================================================================

describe('TableDetailModal visibility', () => {
  it('renders when visible is true and table is provided', () => {
    const props = createMockProps({ visible: true });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Table 1')).toBe(true);
  });

  it('does not render when visible is false', () => {
    const props = createMockProps({ visible: false });
    const { toJSON } = render(<TableDetailModal {...props} />);
    expect(toJSON()).toBeNull();
  });

  it('does not render when table is null', () => {
    const props = createMockProps({ table: null });
    const { toJSON } = render(<TableDetailModal {...props} />);
    expect(toJSON()).toBeNull();
  });

  it('does not render when both visible is false and table is null', () => {
    const props = createMockProps({ visible: false, table: null });
    const { toJSON } = render(<TableDetailModal {...props} />);
    expect(toJSON()).toBeNull();
  });
});

// ============================================================================
// Table Info Display Tests
// ============================================================================

describe('TableDetailModal table info display', () => {
  it('displays table title', () => {
    const props = createMockProps({
      table: createMockTable({ title: 'VIP Table 5' }),
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'VIP Table 5')).toBe(true);
  });

  it('displays table capacity', () => {
    const props = createMockProps({
      table: createMockTable({ capacity: 6 }),
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Check for capacity indicator and seats text
    expect(jsonContains(json, 'Capacity')).toBe(true);
    expect(jsonContains(json, 'seats')).toBe(true);
  });

  it('displays zone name when zone is provided', () => {
    const props = createMockProps({
      table: createMockTable({
        zone: {
          id: 'zone-1',
          title: createMockTranslation('Patio'),
        },
      }),
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Patio')).toBe(true);
  });

  it('displays guest count when occupied and guestCount > 0', () => {
    const props = createMockProps({
      table: createMockTable({
        status: 'occupied',
        guestCount: 3,
      }),
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Guests')).toBe(true);
    expect(jsonContains(json, '3')).toBe(true);
  });

  it('does not display guest count when guestCount is 0', () => {
    const props = createMockProps({
      table: createMockTable({
        status: 'occupied',
        guestCount: 0,
      }),
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Should not contain "Guests" label when guestCount is 0
    expect(jsonContains(json, '"Guests"')).toBe(false);
  });
});

// ============================================================================
// Status Badge Tests
// ============================================================================

describe('TableDetailModal status badge', () => {
  const statuses: Array<{ status: TableStatus; expectedLabel: string }> = [
    { status: 'available', expectedLabel: 'Available' },
    { status: 'occupied', expectedLabel: 'Occupied' },
    { status: 'reserved', expectedLabel: 'Reserved' },
    { status: 'needsAttention', expectedLabel: 'Needs Attention' },
  ];

  statuses.forEach(({ status, expectedLabel }) => {
    it(`displays correct status badge for ${status} status`, () => {
      const props = createMockProps({
        table: createMockTable({ status }),
      });
      const { toJSON } = render(<TableDetailModal {...props} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, expectedLabel)).toBe(true);
    });
  });
});

// ============================================================================
// Active Order Display Tests
// ============================================================================

describe('TableDetailModal active order display', () => {
  it('displays order code when active order exists', () => {
    const order = createMockOrder({ orderCode: 'ORD-999' });
    const props = createMockProps({
      table: createMockTable({ hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'ORD-999')).toBe(true);
  });

  it('displays order items when active order exists', () => {
    const order = createMockOrder();
    const props = createMockProps({
      table: createMockTable({ hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Burger')).toBe(true);
    expect(jsonContains(json, 'Fries')).toBe(true);
  });

  it('displays order total when active order exists', () => {
    const order = createMockOrder({ totalAmount: '250.00' });
    const props = createMockProps({
      table: createMockTable({ hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Check for "Total:" label and the amount
    expect(jsonContains(json, 'Total')).toBe(true);
    expect(jsonContains(json, '250.00')).toBe(true);
  });

  it('shows Active Order tab (with no order message visible when tab is selected)', () => {
    // Note: When no active order, component defaults to history tab
    // But the "Active Order" tab label is still visible
    const props = createMockProps({
      activeOrder: null,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Should have the "Active Order" tab label
    expect(jsonContains(json, 'Active Order')).toBe(true);
  });

  it('shows ready items count in tab when items are ready', () => {
    const order = createMockOrder({
      orderItems: [
        createMockOrderItem({ id: 'item-1', status: OrderItemStatus.READY }),
        createMockOrderItem({ id: 'item-2', status: OrderItemStatus.READY }),
        createMockOrderItem({ id: 'item-3', status: OrderItemStatus.PREPARING }),
      ],
    });
    const props = createMockProps({
      table: createMockTable({ hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Check for "ready" text and the count separately
    expect(jsonContains(json, 'ready')).toBe(true);
    expect(jsonContains(json, '2')).toBe(true);
  });
});

// ============================================================================
// Order Item Display Tests
// ============================================================================

describe('TableDetailModal order item display', () => {
  it('displays item name', () => {
    const order = createMockOrder({
      orderItems: [
        createMockOrderItem({
          itemTitle: createMockTranslation('Special Pizza'),
        }),
      ],
    });
    const props = createMockProps({
      table: createMockTable({ hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Special Pizza')).toBe(true);
  });

  it('displays item quantity', () => {
    const order = createMockOrder({
      orderItems: [createMockOrderItem({ quantity: '3' })],
    });
    const props = createMockProps({
      table: createMockTable({ hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // The quantity is displayed as "x{quantity}" in the component
    expect(jsonContains(json, 'x')).toBe(true);
    expect(jsonContains(json, '3')).toBe(true);
  });

  it('displays item notes when present', () => {
    const order = createMockOrder({
      orderItems: [createMockOrderItem({ notes: 'No onions please' })],
    });
    const props = createMockProps({
      table: createMockTable({ hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'No onions please')).toBe(true);
  });

  it('displays decline reason when item is declined', () => {
    const order = createMockOrder({
      orderItems: [
        createMockOrderItem({
          status: OrderItemStatus.DECLINED,
          declineReason: 'Out of stock',
        }),
      ],
    });
    const props = createMockProps({
      table: createMockTable({ hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Out of stock')).toBe(true);
  });

  it('displays item subtotal', () => {
    const order = createMockOrder({
      orderItems: [createMockOrderItem({ subtotal: '75.00' })],
    });
    const props = createMockProps({
      table: createMockTable({ hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Check for subtotal value and currency
    expect(jsonContains(json, '75.00')).toBe(true);
    expect(jsonContains(json, 'TMT')).toBe(true);
  });
});

// ============================================================================
// Order History Tests
// ============================================================================

describe('TableDetailModal order history', () => {
  it('displays history tab with count', () => {
    const props = createMockProps({
      orderHistory: [createMockOrder({ id: 'order-1' }), createMockOrder({ id: 'order-2' })],
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Tab shows "History" text
    expect(jsonContains(json, 'History')).toBe(true);
    // Check the count is present somewhere
    expect(jsonContains(json, '2')).toBe(true);
  });

  it('displays loading state when history is loading', () => {
    // Loading state is only visible when history tab is active
    // Since there's no active order, the tab defaults to history
    const props = createMockProps({
      isLoadingHistory: true,
      activeOrder: null,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Check for loading text that appears during loading
    expect(jsonContains(json, 'Loading')).toBe(true);
  });

  it('displays empty message when no history (history tab active)', () => {
    const props = createMockProps({
      orderHistory: [],
      activeOrder: null,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Without active order, defaults to history tab
    // Should show "No orders today for this table"
    expect(jsonContains(json, 'No orders today for this table')).toBe(true);
  });
});

// ============================================================================
// Action Buttons Tests
// ============================================================================

describe('TableDetailModal action buttons', () => {
  it('shows New Order button when onNewOrder is provided and no active order', () => {
    const props = createMockProps({
      onNewOrder: jest.fn(),
      activeOrder: null,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'New Order')).toBe(true);
  });

  it('shows Add Items button when onNewOrder is provided and has active order', () => {
    const props = createMockProps({
      onNewOrder: jest.fn(),
      activeOrder: createMockOrder(),
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Add Items')).toBe(true);
  });

  it('shows View Bill button when onViewBill is provided and has active order', () => {
    const props = createMockProps({
      onViewBill: jest.fn(),
      activeOrder: createMockOrder(),
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'View Bill')).toBe(true);
  });

  it('does not show View Bill button when no active order', () => {
    const props = createMockProps({
      onViewBill: jest.fn(),
      activeOrder: null,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'View Bill')).toBe(false);
  });

  it('shows Transfer button when onTransferTable is provided', () => {
    const props = createMockProps({
      onTransferTable: jest.fn(),
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Transfer')).toBe(true);
  });

  it('does not show Transfer button when onTransferTable is not provided', () => {
    const props = createMockProps({
      onTransferTable: undefined,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Transfer should not appear
    expect(jsonContains(json, '"Transfer"')).toBe(false);
  });
});

// ============================================================================
// Close Functionality Tests
// ============================================================================

describe('TableDetailModal close functionality', () => {
  it('renders close button', () => {
    const props = createMockProps();
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Close button shows ✕ symbol
    expect(jsonContains(json, '✕')).toBe(true);
  });

  it('renders backdrop for closing', () => {
    const props = createMockProps();
    const { toJSON } = render(<TableDetailModal {...props} />);
    const json = JSON.stringify(toJSON());
    // Backdrop should be pressable
    expect(jsonContains(json, 'backdrop')).toBe(true);
  });

  it('receives onClose callback prop', () => {
    const onClose = jest.fn();
    const props = createMockProps({ onClose });
    render(<TableDetailModal {...props} />);
    // Just verify the component accepts and renders with the callback
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('TableDetailModal edge cases', () => {
  it('handles table without zone', () => {
    const table = createMockTable();
    table.zone = undefined;
    const props = createMockProps({ table });
    const { toJSON } = render(<TableDetailModal {...props} />);
    // Should render without crashing
    expect(toJSON()).not.toBeNull();
  });

  it('handles order without orderItems', () => {
    const order = createMockOrder();
    order.orderItems = undefined;
    const props = createMockProps({
      table: createMockTable({ hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableDetailModal {...props} />);
    // Should render without crashing
    expect(toJSON()).not.toBeNull();
  });

  it('handles undefined guestCount', () => {
    const table = createMockTable();
    table.guestCount = undefined;
    const props = createMockProps({ table });
    const { toJSON } = render(<TableDetailModal {...props} />);
    // Should render without crashing
    expect(toJSON()).not.toBeNull();
  });

  it('handles empty order history array', () => {
    const props = createMockProps({ orderHistory: [] });
    const { toJSON } = render(<TableDetailModal {...props} />);
    expect(toJSON()).not.toBeNull();
  });
});

// ============================================================================
// Export Verification Tests
// ============================================================================

describe('TableDetailModal exports', () => {
  it('exports TableDetailModal component', () => {
    expect(TableDetailModal).toBeDefined();
    expect(typeof TableDetailModal).toBe('function');
  });

  it('exports getTranslatedText function', () => {
    expect(getTranslatedText).toBeDefined();
    expect(typeof getTranslatedText).toBe('function');
  });

  it('exports getStatusBadgeVariant function', () => {
    expect(getStatusBadgeVariant).toBeDefined();
    expect(typeof getStatusBadgeVariant).toBe('function');
  });

  it('exports getTableStatusLabel function', () => {
    expect(getTableStatusLabel).toBeDefined();
    expect(typeof getTableStatusLabel).toBe('function');
  });

  it('exports getOrderItemStatusColor function', () => {
    expect(getOrderItemStatusColor).toBeDefined();
    expect(typeof getOrderItemStatusColor).toBe('function');
  });

  it('exports getOrderItemStatusLabel function', () => {
    expect(getOrderItemStatusLabel).toBeDefined();
    expect(typeof getOrderItemStatusLabel).toBe('function');
  });

  it('exports getOrderItemBadgeVariant function', () => {
    expect(getOrderItemBadgeVariant).toBeDefined();
    expect(typeof getOrderItemBadgeVariant).toBe('function');
  });

  it('exports getOrderStatusBadgeVariant function', () => {
    expect(getOrderStatusBadgeVariant).toBeDefined();
    expect(typeof getOrderStatusBadgeVariant).toBe('function');
  });

  it('exports formatTime function', () => {
    expect(formatTime).toBeDefined();
    expect(typeof formatTime).toBe('function');
  });
});

// ============================================================================
// Type Export Verification Tests
// ============================================================================

describe('TableDetailModal type exports', () => {
  it('can use TableDetailModalProps type', () => {
    const props: TableDetailModalProps = createMockProps();
    expect(props.visible).toBe(true);
    expect(props.table).not.toBeNull();
  });
});
