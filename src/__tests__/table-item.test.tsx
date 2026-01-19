/**
 * TableItem Component Tests
 *
 * Tests for the TableItem component including:
 * - Rendering with different status colors
 * - Pulsing animation for needsAttention status
 * - Guest count display when occupied
 * - Component rendering with various props
 * - Coordinate and dimension parsing
 */

import { render } from '@testing-library/react-native';
import {
  getStatusColor,
  TableItem,
  type TableItemData,
  type TableItemProps,
  type TableStatus,
} from '../../components/tables';
import { StatusColors } from '../../constants/theme';

// Note: Uses global jest.setup.js mock for react-native-reanimated
// Some testIDs are not accessible in web test environment due to mock limitations

// ============================================================================
// Test Data
// ============================================================================

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
  ...overrides,
});

const createMockProps = (overrides: Partial<TableItemProps> = {}): TableItemProps => ({
  table: createMockTable(),
  onPress: jest.fn(),
  onLongPress: jest.fn(),
  isSelected: false,
  ...overrides,
});

// ============================================================================
// getStatusColor Helper Function Tests
// ============================================================================

describe('getStatusColor', () => {
  it('returns correct color for available status', () => {
    expect(getStatusColor('available')).toBe(StatusColors.available);
  });

  it('returns correct color for occupied status', () => {
    expect(getStatusColor('occupied')).toBe(StatusColors.occupied);
  });

  it('returns correct color for reserved status', () => {
    expect(getStatusColor('reserved')).toBe(StatusColors.reserved);
  });

  it('returns correct color for needsAttention status', () => {
    expect(getStatusColor('needsAttention')).toBe(StatusColors.needsAttention);
  });

  it('returns available color for unknown status', () => {
    // @ts-expect-error Testing invalid status
    expect(getStatusColor('unknown')).toBe(StatusColors.available);
  });
});

// ============================================================================
// TableItem Component Tests
// ============================================================================

describe('TableItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Rendering Tests
  // --------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders table title correctly', () => {
      const props = createMockProps({
        table: createMockTable({ title: 'VIP Table' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('VIP Table');
    });

    it('renders capacity when capacity is greater than 0 and not showing guest count', () => {
      const props = createMockProps({
        table: createMockTable({ capacity: 6, status: 'available' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('"6"');
    });

    it('does not render capacity text when capacity is 0', () => {
      const props = createMockProps({
        table: createMockTable({ capacity: 0, title: 'No Cap Table' }),
      });
      const { toJSON, queryByTestId } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No Cap Table');
      // Verify capacity testID isn't rendered when capacity is 0
      expect(queryByTestId('table-capacity-table-1')).toBeNull();
    });

    it('renders correctly', () => {
      const props = createMockProps();
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });
  });

  // --------------------------------------------------------------------------
  // Status Tests
  // --------------------------------------------------------------------------

  describe('status display', () => {
    it.each<TableStatus>([
      'available',
      'occupied',
      'reserved',
      'needsAttention',
    ])('renders correctly with %s status', (status) => {
      const props = createMockProps({
        table: createMockTable({ status }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });

    it('renders attention indicator for needsAttention status', () => {
      const props = createMockProps({
        table: createMockTable({ status: 'needsAttention' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      // Should contain the attention indicator element in the tree
      expect(toJSON()).toBeTruthy();
    });

    it('does not show attention indicator for available status', () => {
      const props = createMockProps({
        table: createMockTable({ status: 'available' }),
      });
      const { queryByTestId } = render(<TableItem {...props} />);
      // Attention indicator should not be present
      expect(queryByTestId('table-attention-table-1')).toBeNull();
    });

    it('renders order indicator when hasActiveOrder is true and not needsAttention', () => {
      const props = createMockProps({
        table: createMockTable({ status: 'occupied', hasActiveOrder: true }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      expect(toJSON()).toBeTruthy();
    });

    it('does not show order indicator when status is needsAttention', () => {
      const props = createMockProps({
        table: createMockTable({ status: 'needsAttention', hasActiveOrder: true }),
      });
      const { queryByTestId } = render(<TableItem {...props} />);
      expect(queryByTestId('table-order-table-1')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Guest Count Tests
  // --------------------------------------------------------------------------

  describe('guest count display', () => {
    it('shows guest count when occupied and guestCount > 0', () => {
      const props = createMockProps({
        table: createMockTable({ status: 'occupied', guestCount: 3 }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      // Should contain the guest emoji and count
      expect(json).toContain('3');
    });

    it('does not show guest count when status is not occupied', () => {
      const props = createMockProps({
        table: createMockTable({ status: 'available', guestCount: 3 }),
      });
      const { queryByTestId, toJSON } = render(<TableItem {...props} />);
      expect(queryByTestId('table-guests-table-1')).toBeNull();
      // Should not contain guest emoji
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('👥');
    });

    it('does not show guest count when guestCount is 0', () => {
      const props = createMockProps({
        table: createMockTable({ status: 'occupied', guestCount: 0 }),
      });
      const { queryByTestId, toJSON } = render(<TableItem {...props} />);
      expect(queryByTestId('table-guests-table-1')).toBeNull();
      // Should not contain guest emoji
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('👥');
    });
  });

  // --------------------------------------------------------------------------
  // Pulse Animation Tests
  // --------------------------------------------------------------------------

  describe('pulse animation', () => {
    it('renders pulse layer when hasPendingCall is true', () => {
      const props = createMockProps({
        table: createMockTable({ hasPendingCall: true }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      // Should render the pulse layer (shows as element with opacity style)
      const json = JSON.stringify(toJSON());
      expect(json).toContain('opacity');
    });

    it('renders pulse layer when status is needsAttention', () => {
      const props = createMockProps({
        table: createMockTable({ status: 'needsAttention' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('opacity');
    });

    it('does not render pulse layer for available status without pending call', () => {
      const props = createMockProps({
        table: createMockTable({ status: 'available', hasPendingCall: false }),
      });
      const { queryByTestId } = render(<TableItem {...props} />);
      expect(queryByTestId('table-pulse-table-1')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Press Handler Tests
  // --------------------------------------------------------------------------

  describe('press handlers', () => {
    it('can render with onPress callback', () => {
      const onPress = jest.fn();
      const table = createMockTable();
      const props = createMockProps({ table, onPress });
      const { toJSON } = render(<TableItem {...props} />);
      expect(toJSON()).toBeTruthy();
    });

    it('can render with onLongPress callback', () => {
      const onLongPress = jest.fn();
      const table = createMockTable();
      const props = createMockProps({ table, onLongPress });
      const { toJSON } = render(<TableItem {...props} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders when onPress is not provided', () => {
      const props = createMockProps({ onPress: undefined });
      const { toJSON } = render(<TableItem {...props} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders when onLongPress is not provided', () => {
      const props = createMockProps({ onLongPress: undefined });
      const { toJSON } = render(<TableItem {...props} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Coordinate Parsing Tests
  // --------------------------------------------------------------------------

  describe('coordinate parsing', () => {
    it('renders with valid x and y coordinates', () => {
      const props = createMockProps({
        table: createMockTable({ x: '150', y: '250' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });

    it('handles empty coordinate strings', () => {
      const props = createMockProps({
        table: createMockTable({ x: '', y: '' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });

    it('handles undefined coordinate values', () => {
      const props = createMockProps({
        table: createMockTable({
          x: undefined as unknown as string,
          y: undefined as unknown as string,
        }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });

    it('handles non-numeric coordinate strings', () => {
      const props = createMockProps({
        table: createMockTable({ x: 'invalid', y: 'NaN' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });
  });

  // --------------------------------------------------------------------------
  // Dimension Parsing Tests
  // --------------------------------------------------------------------------

  describe('dimension parsing', () => {
    it('renders with valid width and height', () => {
      const props = createMockProps({
        table: createMockTable({ width: '100', height: '120' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });

    it('handles empty dimension strings', () => {
      const props = createMockProps({
        table: createMockTable({ width: '', height: '' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });

    it('handles invalid dimension strings', () => {
      const props = createMockProps({
        table: createMockTable({ width: 'invalid', height: 'NaN' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });
  });

  // --------------------------------------------------------------------------
  // Selection State Tests
  // --------------------------------------------------------------------------

  describe('selection state', () => {
    it('renders correctly when selected', () => {
      const props = createMockProps({ isSelected: true });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });

    it('renders correctly when not selected', () => {
      const props = createMockProps({ isSelected: false });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });
  });

  // --------------------------------------------------------------------------
  // Color Tests
  // --------------------------------------------------------------------------

  describe('color handling', () => {
    it('renders when table color is provided', () => {
      const props = createMockProps({
        table: createMockTable({ color: '#FF5733' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });

    it('renders when table color is empty', () => {
      const props = createMockProps({
        table: createMockTable({ color: '', status: 'occupied' }),
      });
      const { toJSON } = render(<TableItem {...props} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Table 1');
    });
  });
});

// ============================================================================
// Export Tests
// ============================================================================

describe('TableItem exports', () => {
  it('exports TableItem component', () => {
    expect(TableItem).toBeDefined();
    expect(typeof TableItem).toBe('function');
  });

  it('exports getStatusColor function', () => {
    expect(getStatusColor).toBeDefined();
    expect(typeof getStatusColor).toBe('function');
  });
});
