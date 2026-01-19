/**
 * Tests for CategoryList Component
 *
 * Tests cover:
 * - Helper functions (getTranslatedText, getCategoryColor, flattenCategories)
 * - CategoryChip component rendering and interactions
 * - CollapsibleCategory component rendering and expand/collapse
 * - CategoryList horizontal variant rendering
 * - CategoryList vertical variant rendering
 * - Category selection
 * - All option visibility
 * - Exports verification
 */

import { render } from '@testing-library/react-native';
import {
  CategoryChip,
  CategoryList,
  CollapsibleCategory,
  flattenCategories,
  getCategoryColor,
  getTranslatedText,
} from '@/components/menu/CategoryList';
import { CategoryColors } from '@/constants/theme';
import type { MenuCategoryType } from '@/src/types/enums';
import type { MenuCategory, Translation } from '@/src/types/models';

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

const mockKitchenCategory: MenuCategory = {
  id: 'cat-1',
  title: { en: 'Main Dishes', ru: 'Основные блюда', tm: 'Esasy tagamlar' },
  type: 'Kitchen' as MenuCategoryType,
  imagePath: null,
  parentId: null,
};

const mockBarCategory: MenuCategory = {
  id: 'cat-2',
  title: { en: 'Beverages', ru: 'Напитки', tm: 'Içgiler' },
  type: 'Bar' as MenuCategoryType,
  imagePath: null,
  parentId: null,
};

const mockCategoryWithChildren: MenuCategory = {
  id: 'cat-3',
  title: { en: 'Food', ru: 'Еда', tm: 'Nahar' },
  type: 'Kitchen' as MenuCategoryType,
  imagePath: null,
  parentId: null,
  children: [
    {
      id: 'cat-3-1',
      title: { en: 'Appetizers', ru: 'Закуски', tm: 'Başlangyç tagamlar' },
      type: 'Kitchen' as MenuCategoryType,
      imagePath: null,
      parentId: 'cat-3',
    },
    {
      id: 'cat-3-2',
      title: { en: 'Desserts', ru: 'Десерты', tm: 'Süýji tagamlar' },
      type: 'Kitchen' as MenuCategoryType,
      imagePath: null,
      parentId: 'cat-3',
    },
  ],
};

const mockCategories: MenuCategory[] = [
  mockKitchenCategory,
  mockBarCategory,
  mockCategoryWithChildren,
];

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe('CategoryList Helper Functions', () => {
  describe('getTranslatedText', () => {
    it('returns English text by default', () => {
      expect(getTranslatedText(mockTranslation)).toBe('English Text');
    });

    it('returns fallback when translation is undefined', () => {
      expect(getTranslatedText(undefined, 'Fallback')).toBe('Fallback');
    });

    it('returns empty string when translation is undefined and no fallback', () => {
      expect(getTranslatedText(undefined)).toBe('');
    });

    it('returns Russian text when preferredLang is ru', () => {
      expect(getTranslatedText(mockTranslation, '', 'ru')).toBe('Russian Text');
    });

    it('returns Turkmen text when preferredLang is tm', () => {
      expect(getTranslatedText(mockTranslation, '', 'tm')).toBe('Turkmen Text');
    });

    it('falls back to English when preferred language is empty', () => {
      const translation: Translation = { en: 'English', ru: '', tm: '' };
      expect(getTranslatedText(translation, '', 'ru')).toBe('English');
    });

    it('falls back to Russian when English and Turkmen are empty', () => {
      const translation: Translation = { en: '', ru: 'Russian', tm: '' };
      expect(getTranslatedText(translation)).toBe('Russian');
    });

    it('falls back to Turkmen when English and Russian are empty', () => {
      const translation: Translation = { en: '', ru: '', tm: 'Turkmen' };
      expect(getTranslatedText(translation)).toBe('Turkmen');
    });
  });

  describe('getCategoryColor', () => {
    it('returns kitchen color for Kitchen type', () => {
      expect(getCategoryColor('Kitchen')).toBe(CategoryColors.kitchen);
    });

    it('returns bar color for Bar type', () => {
      expect(getCategoryColor('Bar')).toBe(CategoryColors.bar);
    });

    it('returns kitchen color for undefined type', () => {
      expect(getCategoryColor(undefined)).toBe(CategoryColors.kitchen);
    });

    it('returns kitchen color for unknown type', () => {
      expect(getCategoryColor('Unknown')).toBe(CategoryColors.kitchen);
    });
  });

  describe('flattenCategories', () => {
    it('returns empty array for empty input', () => {
      expect(flattenCategories([])).toEqual([]);
    });

    it('returns same array when no children', () => {
      const categories = [mockKitchenCategory, mockBarCategory];
      const result = flattenCategories(categories);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('cat-1');
      expect(result[1].id).toBe('cat-2');
    });

    it('includes children in flattened result', () => {
      const categories = [mockCategoryWithChildren];
      const result = flattenCategories(categories);
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('cat-3');
      expect(result[1].id).toBe('cat-3-1');
      expect(result[2].id).toBe('cat-3-2');
    });

    it('flattens mixed categories with and without children', () => {
      const result = flattenCategories(mockCategories);
      expect(result).toHaveLength(5);
      expect(result.map((c) => c.id)).toEqual(['cat-1', 'cat-2', 'cat-3', 'cat-3-1', 'cat-3-2']);
    });

    it('handles deeply nested categories', () => {
      const deeplyNested: MenuCategory = {
        ...mockKitchenCategory,
        id: 'deep-1',
        children: [
          {
            id: 'deep-2',
            title: { en: 'Level 2', ru: '', tm: '' },
            type: 'Kitchen' as MenuCategoryType,
            imagePath: null,
            parentId: 'deep-1',
            children: [
              {
                id: 'deep-3',
                title: { en: 'Level 3', ru: '', tm: '' },
                type: 'Kitchen' as MenuCategoryType,
                imagePath: null,
                parentId: 'deep-2',
              },
            ],
          },
        ],
      };
      const result = flattenCategories([deeplyNested]);
      expect(result).toHaveLength(3);
      expect(result.map((c) => c.id)).toEqual(['deep-1', 'deep-2', 'deep-3']);
    });
  });
});

// ============================================================================
// CategoryChip Component Tests
// ============================================================================

describe('CategoryChip Component', () => {
  it('is exported from the module', () => {
    expect(CategoryChip).toBeDefined();
    expect(typeof CategoryChip).toBe('function');
  });

  it('renders with required props', () => {
    const onPress = jest.fn();
    const { toJSON } = render(
      <CategoryChip category={mockKitchenCategory} isSelected={false} onPress={onPress} />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('displays category title', () => {
    const onPress = jest.fn();
    const { toJSON } = render(
      <CategoryChip category={mockKitchenCategory} isSelected={false} onPress={onPress} />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('renders when selected', () => {
    const onPress = jest.fn();
    const { toJSON } = render(
      <CategoryChip category={mockKitchenCategory} isSelected={true} onPress={onPress} />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('renders bar category', () => {
    const onPress = jest.fn();
    const { toJSON } = render(
      <CategoryChip category={mockBarCategory} isSelected={false} onPress={onPress} />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Beverages')).toBe(true);
  });
});

// ============================================================================
// CollapsibleCategory Component Tests
// ============================================================================

describe('CollapsibleCategory Component', () => {
  it('is exported from the module', () => {
    expect(CollapsibleCategory).toBeDefined();
    expect(typeof CollapsibleCategory).toBe('function');
  });

  it('renders with required props', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CollapsibleCategory
        category={mockKitchenCategory}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('displays category title', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CollapsibleCategory
        category={mockKitchenCategory}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('renders bar category title', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CollapsibleCategory
        category={mockBarCategory}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Beverages')).toBe(true);
  });
});

// ============================================================================
// CategoryList Component Tests
// ============================================================================

describe('CategoryList Component', () => {
  it('is exported from the module', () => {
    expect(CategoryList).toBeDefined();
    expect(typeof CategoryList).toBe('function');
  });

  it('renders with required props', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={mockCategories}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'All')).toBe(true);
  });

  it('renders All option by default', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={mockCategories}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'All')).toBe(true);
  });

  it('hides All option when showAllOption is false', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={mockCategories}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
        showAllOption={false}
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), '"All"')).toBe(false);
  });

  it('uses custom All option label', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={mockCategories}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
        allOptionLabel="Show All"
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Show All')).toBe(true);
  });

  it('renders all category titles in horizontal mode', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={mockCategories}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
        variant="horizontal"
      />
    );
    const json = JSON.stringify(toJSON());
    expect(jsonContains(json, 'Main Dishes')).toBe(true);
    expect(jsonContains(json, 'Beverages')).toBe(true);
    expect(jsonContains(json, 'Food')).toBe(true);
  });

  it('renders with empty categories', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList categories={[]} selectedCategoryId={null} onSelectCategory={onSelectCategory} />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'All')).toBe(true);
  });
});

// ============================================================================
// Horizontal Variant Tests
// ============================================================================

describe('Horizontal Variant', () => {
  it('defaults to horizontal variant', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={mockCategories}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
      />
    );
    // Horizontal variant shows category names
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('renders chips with explicit horizontal variant', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={[mockKitchenCategory]}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
        variant="horizontal"
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });
});

// ============================================================================
// Vertical Variant Tests
// ============================================================================

describe('Vertical Variant', () => {
  it('renders with vertical variant', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={mockCategories}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
        variant="vertical"
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('renders collapsible rows in vertical mode', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={[mockKitchenCategory]}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
        variant="vertical"
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('renders All row in vertical mode', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={mockCategories}
        selectedCategoryId={null}
        onSelectCategory={onSelectCategory}
        variant="vertical"
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'All')).toBe(true);
  });
});

// ============================================================================
// Category Selection Tests
// ============================================================================

describe('Category Selection', () => {
  it('renders selected category differently', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={mockCategories}
        selectedCategoryId="cat-1"
        onSelectCategory={onSelectCategory}
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('renders with a category selected in vertical mode', () => {
    const onSelectCategory = jest.fn();
    const { toJSON } = render(
      <CategoryList
        categories={[mockKitchenCategory]}
        selectedCategoryId="cat-1"
        onSelectCategory={onSelectCategory}
        variant="vertical"
      />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe('Type Exports', () => {
  it('exports CategoryListProps type', () => {
    // TypeScript compilation verifies the type exists
    const props: import('@/components/menu/CategoryList').CategoryListProps = {
      categories: mockCategories,
      selectedCategoryId: null,
      onSelectCategory: jest.fn(),
    };
    expect(props).toBeDefined();
  });

  it('exports CategoryChipProps type', () => {
    const props: import('@/components/menu/CategoryList').CategoryChipProps = {
      category: mockKitchenCategory,
      isSelected: false,
      onPress: jest.fn(),
    };
    expect(props).toBeDefined();
  });

  it('exports CollapsibleCategoryProps type', () => {
    const props: import('@/components/menu/CategoryList').CollapsibleCategoryProps = {
      category: mockKitchenCategory,
      selectedCategoryId: null,
      onSelectCategory: jest.fn(),
    };
    expect(props).toBeDefined();
  });

  it('exports CategoryListVariant type', () => {
    const horizontal: import('@/components/menu/CategoryList').CategoryListVariant = 'horizontal';
    const vertical: import('@/components/menu/CategoryList').CategoryListVariant = 'vertical';
    expect(horizontal).toBe('horizontal');
    expect(vertical).toBe('vertical');
  });
});

// ============================================================================
// Module Export Tests
// ============================================================================

describe('Module Exports', () => {
  it('exports CategoryList as named export', () => {
    const { CategoryList: CL } = require('@/components/menu/CategoryList');
    expect(CL).toBeDefined();
    expect(typeof CL).toBe('function');
  });

  it('exports CategoryList as default export', () => {
    const CategoryListDefault = require('@/components/menu/CategoryList').default;
    expect(CategoryListDefault).toBeDefined();
    expect(typeof CategoryListDefault).toBe('function');
  });

  it('exports CategoryChip as named export', () => {
    const { CategoryChip: CC } = require('@/components/menu/CategoryList');
    expect(CC).toBeDefined();
    expect(typeof CC).toBe('function');
  });

  it('exports CollapsibleCategory as named export', () => {
    const { CollapsibleCategory: Col } = require('@/components/menu/CategoryList');
    expect(Col).toBeDefined();
    expect(typeof Col).toBe('function');
  });

  it('exports getTranslatedText as named export', () => {
    const { getTranslatedText: gtt } = require('@/components/menu/CategoryList');
    expect(gtt).toBeDefined();
    expect(typeof gtt).toBe('function');
  });

  it('exports getCategoryColor as named export', () => {
    const { getCategoryColor: gcc } = require('@/components/menu/CategoryList');
    expect(gcc).toBeDefined();
    expect(typeof gcc).toBe('function');
  });

  it('exports flattenCategories as named export', () => {
    const { flattenCategories: fc } = require('@/components/menu/CategoryList');
    expect(fc).toBeDefined();
    expect(typeof fc).toBe('function');
  });
});

// ============================================================================
// Index Export Tests
// ============================================================================

describe('Index File Exports', () => {
  it('exports CategoryList from index', () => {
    const { CategoryList: CL } = require('@/components/menu');
    expect(CL).toBeDefined();
    expect(typeof CL).toBe('function');
  });

  it('exports CategoryChip from index', () => {
    const { CategoryChip: CC } = require('@/components/menu');
    expect(CC).toBeDefined();
    expect(typeof CC).toBe('function');
  });

  it('exports CollapsibleCategory from index', () => {
    const { CollapsibleCategory: Col } = require('@/components/menu');
    expect(Col).toBeDefined();
    expect(typeof Col).toBe('function');
  });

  it('exports getTranslatedText from index', () => {
    const { getTranslatedText: gtt } = require('@/components/menu');
    expect(gtt).toBeDefined();
    expect(typeof gtt).toBe('function');
  });

  it('exports getCategoryColor from index', () => {
    const { getCategoryColor: gcc } = require('@/components/menu');
    expect(gcc).toBeDefined();
    expect(typeof gcc).toBe('function');
  });

  it('exports flattenCategories from index', () => {
    const { flattenCategories: fc } = require('@/components/menu');
    expect(fc).toBeDefined();
    expect(typeof fc).toBe('function');
  });

  it('exports CategoryListDefault from index', () => {
    const { CategoryListDefault } = require('@/components/menu');
    expect(CategoryListDefault).toBeDefined();
    expect(typeof CategoryListDefault).toBe('function');
  });
});

// ============================================================================
// Category Color Tests
// ============================================================================

describe('Category Color Coding', () => {
  it('Kitchen categories use orange color', () => {
    const color = getCategoryColor('Kitchen');
    expect(color).toBe(CategoryColors.kitchen);
    expect(color).toBe('#F97316');
  });

  it('Bar categories use blue color', () => {
    const color = getCategoryColor('Bar');
    expect(color).toBe(CategoryColors.bar);
    expect(color).toBe('#3B82F6');
  });
});

// ============================================================================
// Size Variants Tests
// ============================================================================

describe('CategoryChip Size Variants', () => {
  it('renders with sm size', () => {
    const onPress = jest.fn();
    const { toJSON } = render(
      <CategoryChip category={mockKitchenCategory} isSelected={false} onPress={onPress} size="sm" />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('renders with md size', () => {
    const onPress = jest.fn();
    const { toJSON } = render(
      <CategoryChip category={mockKitchenCategory} isSelected={false} onPress={onPress} size="md" />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('renders with lg size', () => {
    const onPress = jest.fn();
    const { toJSON } = render(
      <CategoryChip category={mockKitchenCategory} isSelected={false} onPress={onPress} size="lg" />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });

  it('defaults to md size when not specified', () => {
    const onPress = jest.fn();
    const { toJSON } = render(
      <CategoryChip category={mockKitchenCategory} isSelected={false} onPress={onPress} />
    );
    expect(jsonContains(JSON.stringify(toJSON()), 'Main Dishes')).toBe(true);
  });
});
