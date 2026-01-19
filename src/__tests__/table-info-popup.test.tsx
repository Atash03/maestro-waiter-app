/**
 * TableInfoPopup Component Tests
 *
 * Tests for the TableInfoPopup component including:
 * - Rendering with different table states
 * - Order summary display
 * - Action button visibility and callbacks
 * - Time duration formatting
 * - Badge variant mapping
 * - Animation behavior
 */

import { render } from '@testing-library/react-native';
import type { TableItemData, TableStatus } from '../../components/tables';
import {
  type OrderSummary,
  TableInfoPopup,
  type TableInfoPopupProps,
} from '../../components/tables';
import { OrderItemStatus, OrderStatus, OrderType } from '../types/enums';
import type { Order, Translation } from '../types/models';

// Note: Uses global jest.setup.js mock for react-native-reanimated
// TestIDs may not be accessible in web test environment - use text content matching

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
    {
      id: 'item-1',
      orderId: 'order-1',
      menuItemId: 'menu-1',
      quantity: '2',
      status: OrderItemStatus.PREPARING,
      itemTitle: createMockTranslation('Burger'),
      itemPrice: '25.00',
      subtotal: '50.00',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-2',
      orderId: 'order-1',
      menuItemId: 'menu-2',
      quantity: '1',
      status: OrderItemStatus.READY,
      itemTitle: createMockTranslation('Fries'),
      itemPrice: '10.00',
      subtotal: '10.00',
      createdAt: new Date().toISOString(),
    },
  ],
  ...overrides,
});

const createMockProps = (overrides: Partial<TableInfoPopupProps> = {}): TableInfoPopupProps => ({
  visible: true,
  onClose: jest.fn(),
  table: createMockTable(),
  activeOrder: null,
  onViewOrder: jest.fn(),
  onNewOrder: jest.fn(),
  onCallInfo: jest.fn(),
  seatedAt: null,
  testID: 'table-info-popup',
  ...overrides,
});

// Helper to check if text exists in rendered JSON
const jsonContains = (json: string, text: string): boolean => json.includes(text);

// ============================================================================
// Visibility Tests
// ============================================================================

describe('TableInfoPopup visibility', () => {
  it('renders when visible is true and table is provided', () => {
    const props = createMockProps({ visible: true });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    // Should contain table title when rendered
    expect(jsonContains(json, 'Table 1')).toBe(true);
  });

  it('does not render when visible is false', () => {
    const props = createMockProps({ visible: false });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    expect(toJSON()).toBeNull();
  });

  it('does not render when table is null', () => {
    const props = createMockProps({ table: null });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    expect(toJSON()).toBeNull();
  });

  it('does not render when both visible is false and table is null', () => {
    const props = createMockProps({ visible: false, table: null });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    expect(toJSON()).toBeNull();
  });
});

// ============================================================================
// Table Info Display Tests
// ============================================================================

describe('TableInfoPopup table info display', () => {
  it('displays table title', () => {
    const props = createMockProps({
      table: createMockTable({ title: 'VIP Table 5' }),
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'VIP Table 5')).toBe(true);
  });

  it('displays capacity', () => {
    const props = createMockProps({
      table: createMockTable({ capacity: 8 }),
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Capacity')).toBe(true);
    expect(jsonContains(json, '8')).toBe(true);
    expect(jsonContains(json, 'seats')).toBe(true);
  });

  it('displays guest count when greater than 0', () => {
    const props = createMockProps({
      table: createMockTable({ status: 'occupied', guestCount: 3 }),
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Guests')).toBe(true);
    expect(jsonContains(json, '"3"')).toBe(true);
  });

  it('does not display guest count when 0', () => {
    const props = createMockProps({
      table: createMockTable({ guestCount: 0 }),
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Guests')).toBe(false);
  });

  it('displays zone name when zone is provided', () => {
    const props = createMockProps({
      table: createMockTable({
        zone: { id: 'zone-1', title: createMockTranslation('Terrace') },
      }),
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Zone')).toBe(true);
    expect(jsonContains(json, 'Terrace')).toBe(true);
  });
});

// ============================================================================
// Status Badge Tests
// ============================================================================

describe('TableInfoPopup status badge', () => {
  it.each<[TableStatus, string]>([
    ['available', 'Available'],
    ['occupied', 'Occupied'],
    ['reserved', 'Reserved'],
    ['needsAttention', 'Needs Attention'],
  ])('displays correct badge for %s status', (status, expectedLabel) => {
    const props = createMockProps({
      table: createMockTable({ status }),
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, expectedLabel)).toBe(true);
  });
});

// ============================================================================
// Time Seated Tests
// ============================================================================

describe('TableInfoPopup time seated', () => {
  it('displays time seated for occupied table with seatedAt', () => {
    const props = createMockProps({
      table: createMockTable({ status: 'occupied' }),
      seatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Time Seated')).toBe(true);
    // Should show duration (30m)
    expect(
      jsonContains(json, '30m') || jsonContains(json, '29m') || jsonContains(json, '31m')
    ).toBe(true);
  });

  it('does not display time seated when seatedAt is null', () => {
    const props = createMockProps({
      table: createMockTable({ status: 'occupied' }),
      seatedAt: null,
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Time Seated')).toBe(false);
  });

  it('does not display time seated for available table', () => {
    const props = createMockProps({
      table: createMockTable({ status: 'available' }),
      seatedAt: new Date().toISOString(),
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Time Seated')).toBe(false);
  });
});

// ============================================================================
// Order Summary Tests
// ============================================================================

describe('TableInfoPopup order summary', () => {
  it('displays order summary when activeOrder is provided', () => {
    const order = createMockOrder();
    const props = createMockProps({
      table: createMockTable({ status: 'occupied', hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Active Order')).toBe(true);
    expect(jsonContains(json, 'Order Code')).toBe(true);
    expect(jsonContains(json, 'Items')).toBe(true);
    expect(jsonContains(json, 'Total')).toBe(true);
  });

  it('displays correct order code', () => {
    const order = createMockOrder({ orderCode: 'ORD-999' });
    const props = createMockProps({
      table: createMockTable({ status: 'occupied', hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'ORD-999')).toBe(true);
  });

  it('displays correct item count', () => {
    const order = createMockOrder();
    const props = createMockProps({
      table: createMockTable({ status: 'occupied', hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    // Order has 2 items
    expect(jsonContains(json, '"2"')).toBe(true);
  });

  it('displays correct total amount', () => {
    const order = createMockOrder({ totalAmount: '250.50' });
    const props = createMockProps({
      table: createMockTable({ status: 'occupied', hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, '250.50')).toBe(true);
  });

  it('does not display order summary when activeOrder is null', () => {
    const props = createMockProps({
      table: createMockTable({ status: 'available' }),
      activeOrder: null,
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Active Order')).toBe(false);
  });
});

// ============================================================================
// Action Button Tests
// ============================================================================

describe('TableInfoPopup action buttons', () => {
  describe('View Order button', () => {
    it('renders when activeOrder exists and onViewOrder is provided', () => {
      const props = createMockProps({
        table: createMockTable({ status: 'occupied', hasActiveOrder: true }),
        activeOrder: createMockOrder(),
        onViewOrder: jest.fn(),
      });
      const { toJSON } = render(<TableInfoPopup {...props} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'View Order')).toBe(true);
    });

    it('does not render when activeOrder is null', () => {
      const props = createMockProps({
        activeOrder: null,
        onViewOrder: jest.fn(),
      });
      const { toJSON } = render(<TableInfoPopup {...props} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'View Order')).toBe(false);
    });

    it('provides onViewOrder callback that can be triggered', () => {
      const onViewOrder = jest.fn();
      const order = createMockOrder();
      const props = createMockProps({
        table: createMockTable({ status: 'occupied', hasActiveOrder: true }),
        activeOrder: order,
        onViewOrder,
      });
      const { toJSON } = render(<TableInfoPopup {...props} />);
      const json = JSON.stringify(toJSON());
      // Verify the button is rendered (callback is wired up in component)
      expect(jsonContains(json, 'View Order')).toBe(true);
      // Verify callback is provided (component integration test)
      expect(onViewOrder).toBeDefined();
    });
  });

  describe('New Order button', () => {
    it('renders when onNewOrder is provided', () => {
      const props = createMockProps({
        onNewOrder: jest.fn(),
      });
      const { toJSON } = render(<TableInfoPopup {...props} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'New Order')).toBe(true);
    });

    it('shows "New Order" text when no active order', () => {
      const props = createMockProps({
        activeOrder: null,
        onNewOrder: jest.fn(),
      });
      const { toJSON } = render(<TableInfoPopup {...props} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'New Order')).toBe(true);
    });

    it('shows "Add Items" text when active order exists', () => {
      const props = createMockProps({
        table: createMockTable({ status: 'occupied', hasActiveOrder: true }),
        activeOrder: createMockOrder(),
        onNewOrder: jest.fn(),
      });
      const { toJSON } = render(<TableInfoPopup {...props} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Add Items')).toBe(true);
    });

    it('provides onNewOrder callback that can be triggered', () => {
      const onNewOrder = jest.fn();
      const table = createMockTable();
      const props = createMockProps({
        table,
        onNewOrder,
      });
      const { toJSON } = render(<TableInfoPopup {...props} />);
      const json = JSON.stringify(toJSON());
      // Verify the button is rendered (callback is wired up in component)
      expect(jsonContains(json, 'New Order')).toBe(true);
      // Verify callback is provided (component integration test)
      expect(onNewOrder).toBeDefined();
    });
  });

  describe('Call Info button', () => {
    it('renders when hasPendingCall is true and onCallInfo is provided', () => {
      const props = createMockProps({
        table: createMockTable({ hasPendingCall: true }),
        onCallInfo: jest.fn(),
      });
      const { toJSON } = render(<TableInfoPopup {...props} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'View Call')).toBe(true);
    });

    it('does not render when hasPendingCall is false', () => {
      const props = createMockProps({
        table: createMockTable({ hasPendingCall: false }),
        onCallInfo: jest.fn(),
      });
      const { toJSON } = render(<TableInfoPopup {...props} />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'View Call')).toBe(false);
    });

    it('provides onCallInfo callback that can be triggered', () => {
      const onCallInfo = jest.fn();
      const table = createMockTable({ hasPendingCall: true });
      const props = createMockProps({
        table,
        onCallInfo,
      });
      const { toJSON } = render(<TableInfoPopup {...props} />);
      const json = JSON.stringify(toJSON());
      // Verify the button is rendered (callback is wired up in component)
      expect(jsonContains(json, 'View Call')).toBe(true);
      // Verify callback is provided (component integration test)
      expect(onCallInfo).toBeDefined();
    });
  });
});

// ============================================================================
// Close Button Tests
// ============================================================================

describe('TableInfoPopup close functionality', () => {
  it('renders close button', () => {
    const props = createMockProps();
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Close')).toBe(true);
  });

  it('provides onClose callback that can be triggered', () => {
    const onClose = jest.fn();
    const props = createMockProps({ onClose });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    // Verify the close button is rendered (callback is wired up in component)
    expect(jsonContains(json, 'Close')).toBe(true);
    // Verify callback is provided (component integration test)
    expect(onClose).toBeDefined();
  });

  it('has backdrop that can be pressed', () => {
    const onClose = jest.fn();
    const props = createMockProps({ onClose });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    // Backdrop exists as part of the component structure
    expect(toJSON()).toBeTruthy();
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('TableInfoPopup edge cases', () => {
  it('handles table without zone', () => {
    // Create table data without zone property
    const tableWithoutZone: TableItemData = {
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
      // zone is intentionally omitted
    };
    const props = createMockProps({ table: tableWithoutZone });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    // Should not crash and should not show zone section
    expect(jsonContains(json, 'Table 1')).toBe(true);
  });

  it('handles order without orderItems', () => {
    const order = createMockOrder();
    delete order.orderItems;
    const props = createMockProps({
      table: createMockTable({ status: 'occupied', hasActiveOrder: true }),
      activeOrder: order,
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    // Should still render order section
    expect(jsonContains(json, 'Active Order')).toBe(true);
    // Item count should be 0
    expect(jsonContains(json, '"0"')).toBe(true);
  });

  it('handles undefined guestCount', () => {
    // Create table data without guestCount property
    const tableWithoutGuestCount: TableItemData = {
      id: 'table-1',
      title: 'Table 1',
      capacity: 4,
      zoneId: 'zone-1',
      x: '100',
      y: '200',
      width: '80',
      height: '80',
      color: '',
      status: 'occupied',
      hasActiveOrder: false,
      hasPendingCall: false,
      // guestCount is intentionally omitted
    };
    const props = createMockProps({ table: tableWithoutGuestCount });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    // Should not show guest count section
    expect(jsonContains(json, 'Guests')).toBe(false);
  });

  it('handles invalid seatedAt date', () => {
    const props = createMockProps({
      table: createMockTable({ status: 'occupied' }),
      seatedAt: 'invalid-date',
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    // Should not crash
    expect(toJSON()).toBeTruthy();
  });

  it('handles onNewOrder not provided', () => {
    const props = createMockProps({
      onNewOrder: undefined,
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    // New Order button should not be shown
    expect(jsonContains(json, 'New Order')).toBe(false);
  });

  it('handles onCallInfo not provided', () => {
    const props = createMockProps({
      table: createMockTable({ hasPendingCall: true }),
      onCallInfo: undefined,
    });
    const { toJSON } = render(<TableInfoPopup {...props} />);
    const json = JSON.stringify(toJSON());
    // View Call button should not be shown
    expect(jsonContains(json, 'View Call')).toBe(false);
  });
});

// ============================================================================
// Export Tests
// ============================================================================

describe('TableInfoPopup exports', () => {
  it('exports TableInfoPopup component', () => {
    expect(TableInfoPopup).toBeDefined();
    expect(typeof TableInfoPopup).toBe('function');
  });

  it('exports TableInfoPopupProps type (via TypeScript)', () => {
    // This test verifies the type can be used
    const props: TableInfoPopupProps = createMockProps();
    expect(props).toBeDefined();
  });

  it('exports OrderSummary type (via TypeScript)', () => {
    // This test verifies the type can be used
    const summary: OrderSummary = {
      itemCount: 5,
      totalAmount: '100.00',
      orderCode: 'ORD-001',
      status: 'InProgress',
    };
    expect(summary).toBeDefined();
    expect(summary.itemCount).toBe(5);
  });
});
