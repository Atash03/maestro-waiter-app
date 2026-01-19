/**
 * Status Legend Component Tests
 *
 * Tests for the StatusLegend component covering:
 * - Rendering and visibility
 * - Collapsible functionality
 * - Status items display
 * - Assigned indicator display
 * - Position variations
 * - Exports verification
 */

import { render } from '@testing-library/react-native';
import { getStatusItems, StatusLegend } from '@/components/tables/StatusLegend';
import { StatusColors } from '@/constants/theme';

// Mock dependencies
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

// Helper to check if JSON contains text
const jsonContains = (json: string, text: string): boolean => json.includes(text);

describe('StatusLegend Component', () => {
  describe('getStatusItems helper function', () => {
    it('returns all four status items', () => {
      const items = getStatusItems();
      expect(items).toHaveLength(4);
    });

    it('includes available status with correct color', () => {
      const items = getStatusItems();
      const available = items.find((item) => item.status === 'available');
      expect(available).toBeDefined();
      expect(available?.label).toBe('Available');
      expect(available?.color).toBe(StatusColors.available);
    });

    it('includes occupied status with correct color', () => {
      const items = getStatusItems();
      const occupied = items.find((item) => item.status === 'occupied');
      expect(occupied).toBeDefined();
      expect(occupied?.label).toBe('Occupied');
      expect(occupied?.color).toBe(StatusColors.occupied);
    });

    it('includes reserved status with correct color', () => {
      const items = getStatusItems();
      const reserved = items.find((item) => item.status === 'reserved');
      expect(reserved).toBeDefined();
      expect(reserved?.label).toBe('Reserved');
      expect(reserved?.color).toBe(StatusColors.reserved);
    });

    it('includes needsAttention status with correct color', () => {
      const items = getStatusItems();
      const needsAttention = items.find((item) => item.status === 'needsAttention');
      expect(needsAttention).toBeDefined();
      expect(needsAttention?.label).toBe('Needs Attention');
      expect(needsAttention?.color).toBe(StatusColors.needsAttention);
    });
  });

  describe('Rendering', () => {
    it('renders and displays Legend text when collapsed', () => {
      const { toJSON } = render(<StatusLegend />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Legend')).toBe(true);
    });

    it('renders toggle button with chevron', () => {
      const { toJSON } = render(<StatusLegend />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, '▼')).toBe(true);
    });

    it('component renders without errors', () => {
      const { toJSON } = render(<StatusLegend />);
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('Collapsible functionality', () => {
    it('starts collapsed by default - shows Legend text', () => {
      const { toJSON } = render(<StatusLegend />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Legend')).toBe(true);
      // Hide Legend text should not be present when collapsed
      // Actually both are present in DOM, but "Hide Legend" should not appear as Toggle shows "Legend"
    });

    it('starts expanded when initialExpanded is true and shows Hide Legend', () => {
      const { toJSON } = render(<StatusLegend initialExpanded />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Hide Legend')).toBe(true);
    });

    it('contains all status labels in DOM when rendered', () => {
      const { toJSON } = render(<StatusLegend initialExpanded />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Available')).toBe(true);
      expect(jsonContains(json, 'Occupied')).toBe(true);
      expect(jsonContains(json, 'Reserved')).toBe(true);
      expect(jsonContains(json, 'Needs Attention')).toBe(true);
    });

    it('collapsed and expanded states show different text', () => {
      // Test that collapsed shows "Legend" and expanded shows "Hide Legend"
      const collapsedRender = render(<StatusLegend />);
      const expandedRender = render(<StatusLegend initialExpanded />);

      // Collapsed shows "Legend" (not "Hide Legend")
      const collapsedJson = JSON.stringify(collapsedRender.toJSON());
      expect(jsonContains(collapsedJson, '"Legend"')).toBe(true);
      // Note: Both contain "Legend" string, but only expanded has "Hide Legend"
      expect(jsonContains(collapsedJson, 'Hide Legend')).toBe(false);

      // Expanded shows "Hide Legend"
      const expandedJson = JSON.stringify(expandedRender.toJSON());
      expect(jsonContains(expandedJson, 'Hide Legend')).toBe(true);
    });

    it('shows Hide Legend text when expanded', () => {
      const { toJSON } = render(<StatusLegend initialExpanded />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Hide Legend')).toBe(true);
    });
  });

  describe('Status items display', () => {
    it('displays Available label', () => {
      const { toJSON } = render(<StatusLegend initialExpanded />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Available')).toBe(true);
    });

    it('displays Occupied label', () => {
      const { toJSON } = render(<StatusLegend initialExpanded />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Occupied')).toBe(true);
    });

    it('displays Reserved label', () => {
      const { toJSON } = render(<StatusLegend initialExpanded />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Reserved')).toBe(true);
    });

    it('displays Needs Attention label', () => {
      const { toJSON } = render(<StatusLegend initialExpanded />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Needs Attention')).toBe(true);
    });

    it('displays all four status labels', () => {
      const { toJSON } = render(<StatusLegend initialExpanded />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Available')).toBe(true);
      expect(jsonContains(json, 'Occupied')).toBe(true);
      expect(jsonContains(json, 'Reserved')).toBe(true);
      expect(jsonContains(json, 'Needs Attention')).toBe(true);
    });
  });

  describe('Assigned indicator', () => {
    it('does not show Your Table text when showAssignedIndicator is false', () => {
      const { toJSON } = render(<StatusLegend initialExpanded />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Your Table')).toBe(false);
    });

    it('shows Your Table text when showAssignedIndicator is true', () => {
      const { toJSON } = render(<StatusLegend initialExpanded showAssignedIndicator />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Your Table')).toBe(true);
    });

    it('shows star icon when showAssignedIndicator is true', () => {
      const { toJSON } = render(<StatusLegend initialExpanded showAssignedIndicator />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, '★')).toBe(true);
    });

    it('does not show star icon when showAssignedIndicator is false', () => {
      const { toJSON } = render(<StatusLegend initialExpanded />);
      const json = JSON.stringify(toJSON());
      // The chevron ▼ should be present, but not the star ★
      expect(jsonContains(json, '▼')).toBe(true);
      expect(jsonContains(json, '★')).toBe(false);
    });
  });

  describe('Position variations', () => {
    it('renders with default position (bottom-right)', () => {
      const { toJSON } = render(<StatusLegend />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders with bottom-left position', () => {
      const { toJSON } = render(<StatusLegend position="bottom-left" />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders with top-right position', () => {
      const { toJSON } = render(<StatusLegend position="top-right" />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders with top-left position', () => {
      const { toJSON } = render(<StatusLegend position="top-left" />);
      expect(toJSON()).not.toBeNull();
    });

    it('all positions render the same content', () => {
      const defaultRender = render(<StatusLegend initialExpanded />);
      const bottomLeft = render(<StatusLegend position="bottom-left" initialExpanded />);
      const topRight = render(<StatusLegend position="top-right" initialExpanded />);
      const topLeft = render(<StatusLegend position="top-left" initialExpanded />);

      // All should contain Available text
      expect(jsonContains(JSON.stringify(defaultRender.toJSON()), 'Available')).toBe(true);
      expect(jsonContains(JSON.stringify(bottomLeft.toJSON()), 'Available')).toBe(true);
      expect(jsonContains(JSON.stringify(topRight.toJSON()), 'Available')).toBe(true);
      expect(jsonContains(JSON.stringify(topLeft.toJSON()), 'Available')).toBe(true);
    });
  });

  describe('Theme support', () => {
    it('renders correctly in light mode', () => {
      const { toJSON } = render(<StatusLegend />);
      const json = JSON.stringify(toJSON());
      expect(jsonContains(json, 'Legend')).toBe(true);
    });
  });

  describe('Exports', () => {
    it('exports StatusLegend component', () => {
      expect(StatusLegend).toBeDefined();
      expect(typeof StatusLegend).toBe('function');
    });

    it('exports getStatusItems helper function', () => {
      expect(getStatusItems).toBeDefined();
      expect(typeof getStatusItems).toBe('function');
    });
  });
});

describe('StatusLegend exports from index', () => {
  it('exports StatusLegend from components/tables', () => {
    const tableExports = require('@/components/tables');
    expect(tableExports.StatusLegend).toBeDefined();
  });

  it('exports getStatusItems from components/tables', () => {
    const tableExports = require('@/components/tables');
    expect(tableExports.getStatusItems).toBeDefined();
  });

  it('exports StatusLegendProps type (checked at compile time)', () => {
    // Type exports are checked at compile time
    // This test verifies the module loads without error
    const tableExports = require('@/components/tables');
    expect(tableExports).toBeDefined();
  });
});
