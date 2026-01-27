/**
 * Category Card Component
 *
 * Displays parent menu categories as image cards in a grid.
 * Used as the initial view in order entry before drilling down
 * to child category tabs and menu items.
 */

import { Image } from 'expo-image';
import { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { getImageUrl } from '@/src/services/api/client';
import { getTranslatedText } from '@/src/stores/menuStore';
import type { MenuCategory } from '@/src/types/models';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const placeholderImage = require('@/assets/images/placeholder.png');

// ============================================================================
// Types
// ============================================================================

export interface CategoryCardProps {
  category: MenuCategory;
  onPress: (category: MenuCategory) => void;
  testID?: string;
}

export interface CategoryCardGridProps {
  categories: MenuCategory[];
  onCategoryPress: (category: MenuCategory) => void;
  isTablet: boolean;
  testID?: string;
}

// ============================================================================
// Category Card Component
// ============================================================================

export function CategoryCard({ category, onPress, testID }: CategoryCardProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const resolvedUrl = getImageUrl(category.imagePath);
  const imageSource = resolvedUrl ? { uri: resolvedUrl } : placeholderImage;

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        testID={testID ?? `category-card-${category.id}`}
        style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => onPress(category)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Image
          testID={`category-card-image-${category.id}`}
          source={imageSource}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        <ThemedText style={styles.title} numberOfLines={1}>
          {getTranslatedText(category.title)}
        </ThemedText>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// Category Card Grid Component
// ============================================================================

export function CategoryCardGrid({
  categories,
  onCategoryPress,
  isTablet,
  testID = 'category-card-grid',
}: CategoryCardGridProps) {
  if (categories.length === 0) {
    return (
      <View style={styles.emptyState} testID="category-grid-empty">
        <ThemedText style={styles.emptyStateText}>No categories available</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.grid, isTablet && styles.gridTablet]} testID={testID}>
      {categories.map((category) => (
        <View key={category.id} style={[styles.gridCell, isTablet && styles.gridCellTablet]}>
          <CategoryCard category={category} onPress={onCategoryPress} />
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingTop: 5,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gridTablet: {
    gap: Spacing.lg,
  },
  gridCell: {
    width: '48%',
  },
  gridCellTablet: {
    width: '31%',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
