/**
 * Menu Categories Component
 *
 * Displays menu categories as horizontal scrollable chips or
 * vertical list with collapsible subcategories.
 *
 * Features:
 * - Horizontal scrollable category chips (default)
 * - Vertical list with collapsible subcategories
 * - Color-coded by type (Kitchen: orange, Bar: blue)
 * - Active category highlighting
 * - Smooth scroll animation
 * - "All" category option
 * - Subcategory support
 */

import { useCallback, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, CategoryColors, Colors, Spacing } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import type { MenuCategory, Translation } from '@/src/types/models';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// Types
// ============================================================================

export type CategoryListVariant = 'horizontal' | 'vertical';

export interface CategoryListProps {
  /** Array of menu categories */
  categories: MenuCategory[];
  /** Currently selected category ID (null for "All") */
  selectedCategoryId: string | null;
  /** Callback when a category is selected */
  onSelectCategory: (categoryId: string | null) => void;
  /** Display variant: horizontal chips or vertical list */
  variant?: CategoryListVariant;
  /** Whether to show the "All" category option */
  showAllOption?: boolean;
  /** Label for the "All" option */
  allOptionLabel?: string;
  /** Whether to show subcategories (vertical variant only) */
  showSubcategories?: boolean;
  /** Test ID for testing */
  testID?: string;
}

export interface CategoryChipProps {
  /** The category to display */
  category: MenuCategory;
  /** Whether this category is selected */
  isSelected: boolean;
  /** Callback when pressed */
  onPress: (categoryId: string) => void;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Test ID for testing */
  testID?: string;
}

export interface CollapsibleCategoryProps {
  /** The category to display */
  category: MenuCategory;
  /** Currently selected category ID */
  selectedCategoryId: string | null;
  /** Callback when a category is selected */
  onSelectCategory: (categoryId: string) => void;
  /** Whether to show subcategories */
  showSubcategories?: boolean;
  /** Depth level for indentation */
  depth?: number;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get translated text from a Translation object
 */
export function getTranslatedText(
  translation: Translation | undefined,
  fallback = '',
  preferredLang: 'en' | 'ru' | 'tm' = 'en'
): string {
  if (!translation) return fallback;
  return (
    translation[preferredLang] || translation.en || translation.ru || translation.tm || fallback
  );
}

/**
 * Get category color based on type
 */
export function getCategoryColor(type: string | undefined): string {
  if (type === 'Kitchen') return CategoryColors.kitchen;
  if (type === 'Bar') return CategoryColors.bar;
  return CategoryColors.kitchen; // Default to kitchen color
}

/**
 * Flatten categories to include nested children at root level for filtering
 */
export function flattenCategories(categories: MenuCategory[]): MenuCategory[] {
  const result: MenuCategory[] = [];

  function traverse(cats: MenuCategory[]) {
    for (const cat of cats) {
      result.push(cat);
      if (cat.children && cat.children.length > 0) {
        traverse(cat.children);
      }
    }
  }

  traverse(categories);
  return result;
}

// ============================================================================
// Category Chip Component (for horizontal variant)
// ============================================================================

export function CategoryChip({
  category,
  isSelected,
  onPress,
  size = 'md',
  testID,
}: CategoryChipProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const scale = useSharedValue(1);

  const categoryColor = getCategoryColor(category.type);

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeStyles = {
    sm: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, fontSize: 12 },
    md: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, fontSize: 14 },
    lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, fontSize: 16 },
  };

  const currentSize = sizeStyles[size];

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        testID={testID ?? `category-chip-${category.id}`}
        style={[
          styles.categoryChip,
          {
            paddingHorizontal: currentSize.paddingHorizontal,
            paddingVertical: currentSize.paddingVertical,
            backgroundColor: isSelected ? categoryColor : colors.backgroundSecondary,
            borderColor: isSelected ? categoryColor : colors.border,
          },
        ]}
        onPress={() => onPress(category.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <ThemedText
          style={[
            styles.categoryChipText,
            {
              fontSize: currentSize.fontSize,
              color: isSelected ? '#FFFFFF' : colors.text,
            },
          ]}
        >
          {getTranslatedText(category.title)}
        </ThemedText>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// Collapsible Category Component (for vertical variant)
// ============================================================================

export function CollapsibleCategory({
  category,
  selectedCategoryId,
  onSelectCategory,
  showSubcategories = true,
  depth = 0,
  testID,
}: CollapsibleCategoryProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isExpanded, setIsExpanded] = useState(false);

  const rotateValue = useSharedValue(0);

  const hasChildren = showSubcategories && category.children && category.children.length > 0;
  const isSelected = selectedCategoryId === category.id;
  const categoryColor = getCategoryColor(category.type);

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
    rotateValue.value = withTiming(isExpanded ? 0 : 1, { duration: 200 });
  }, [isExpanded, rotateValue]);

  const handlePress = useCallback(() => {
    if (hasChildren) {
      handleToggleExpand();
    }
    onSelectCategory(category.id);
  }, [hasChildren, handleToggleExpand, onSelectCategory, category.id]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value * 90}deg` }],
  }));

  return (
    <View testID={testID ?? `collapsible-category-${category.id}`}>
      <TouchableOpacity
        testID={`category-row-${category.id}`}
        style={[
          styles.collapsibleRow,
          {
            paddingLeft: Spacing.lg + depth * Spacing.lg,
            backgroundColor: isSelected ? colors.backgroundSecondary : 'transparent',
            borderLeftColor: isSelected ? categoryColor : 'transparent',
            borderLeftWidth: isSelected ? 3 : 0,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {/* Category type indicator */}
        <View
          style={[styles.categoryTypeIndicator, { backgroundColor: categoryColor }]}
          testID={`category-type-indicator-${category.id}`}
        />

        {/* Category title */}
        <ThemedText
          style={[styles.collapsibleTitle, { color: isSelected ? categoryColor : colors.text }]}
          numberOfLines={1}
        >
          {getTranslatedText(category.title)}
        </ThemedText>

        {/* Expand/collapse chevron */}
        {hasChildren && (
          <Animated.View style={chevronStyle}>
            <ThemedText style={[styles.chevron, { color: colors.textMuted }]}>›</ThemedText>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Subcategories */}
      {hasChildren && isExpanded && (
        <View testID={`subcategories-${category.id}`}>
          {category.children?.map((child) => (
            <CollapsibleCategory
              key={child.id}
              category={child}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              showSubcategories={showSubcategories}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Main CategoryList Component
// ============================================================================

export function CategoryList({
  categories,
  selectedCategoryId,
  onSelectCategory,
  variant = 'horizontal',
  showAllOption = true,
  allOptionLabel = 'All',
  showSubcategories = true,
  testID = 'category-list',
}: CategoryListProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scrollViewRef = useRef<ScrollView>(null);

  // Handler for category selection that auto-scrolls in horizontal mode
  const handleSelectCategory = useCallback(
    (categoryId: string | null) => {
      onSelectCategory(categoryId);
    },
    [onSelectCategory]
  );

  // "All" chip with primary color
  const AllChip = () => {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
      scale.value = withSpring(0.95);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          testID="category-chip-all"
          style={[
            styles.categoryChip,
            {
              backgroundColor:
                selectedCategoryId === null ? colors.tint : colors.backgroundSecondary,
              borderColor: selectedCategoryId === null ? colors.tint : colors.border,
            },
          ]}
          onPress={() => handleSelectCategory(null)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
        >
          <ThemedText
            style={[
              styles.categoryChipText,
              { color: selectedCategoryId === null ? '#FFFFFF' : colors.text },
            ]}
          >
            {allOptionLabel}
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Horizontal variant
  if (variant === 'horizontal') {
    return (
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContent}
        testID={testID}
      >
        {/* All Categories */}
        {showAllOption && <AllChip />}

        {/* Category chips */}
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            category={category}
            isSelected={selectedCategoryId === category.id}
            onPress={handleSelectCategory}
          />
        ))}
      </ScrollView>
    );
  }

  // Vertical variant with collapsible subcategories
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.verticalContent}
      testID={testID}
    >
      {/* All Categories */}
      {showAllOption && (
        <TouchableOpacity
          testID="category-row-all"
          style={[
            styles.collapsibleRow,
            {
              paddingLeft: Spacing.lg,
              backgroundColor:
                selectedCategoryId === null ? colors.backgroundSecondary : 'transparent',
              borderLeftColor: selectedCategoryId === null ? colors.tint : 'transparent',
              borderLeftWidth: selectedCategoryId === null ? 3 : 0,
            },
          ]}
          onPress={() => handleSelectCategory(null)}
          activeOpacity={0.7}
        >
          <View style={[styles.categoryTypeIndicator, { backgroundColor: colors.tint }]} />
          <ThemedText
            style={[
              styles.collapsibleTitle,
              { color: selectedCategoryId === null ? colors.tint : colors.text },
            ]}
          >
            {allOptionLabel}
          </ThemedText>
        </TouchableOpacity>
      )}

      {/* Category rows */}
      {categories.map((category) => (
        <CollapsibleCategory
          key={category.id}
          category={category}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
          showSubcategories={showSubcategories}
        />
      ))}
    </ScrollView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  horizontalContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  verticalContent: {
    paddingVertical: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  collapsibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryTypeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  collapsibleTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CategoryList;
