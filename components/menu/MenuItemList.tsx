/**
 * Menu Item List Component
 *
 * Displays menu items in a grid or list layout.
 *
 * Features:
 * - Grid view for tablets, list for phones
 * - High-quality images with fallback placeholder
 * - Item name, price, brief description
 * - "Not available" state for inactive items
 * - Quantity badges if already in order
 * - Press animation with visual feedback
 * - Empty state display
 */

import { Image } from 'expo-image';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, BrandColors, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { MenuItem, Translation } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

export type MenuItemListVariant = 'grid' | 'list' | 'auto';

export interface MenuItemListProps {
  /** Array of menu items to display */
  items: MenuItem[];
  /** Map of item ID to quantity in current order */
  itemQuantities?: Record<string, number>;
  /** Callback when an item is pressed */
  onItemPress?: (item: MenuItem) => void;
  /** Callback when an item is long pressed */
  onItemLongPress?: (item: MenuItem) => void;
  /** Display variant: grid, list, or auto (based on screen width) */
  variant?: MenuItemListVariant;
  /** Number of columns for grid view (default: 2 for phone, 3 for tablet) */
  numColumns?: number;
  /** Whether to show item descriptions */
  showDescription?: boolean;
  /** Whether to show item images */
  showImages?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Test ID for testing */
  testID?: string;
  /** Callback for pull-to-refresh */
  onRefresh?: () => void;
  /** Whether refresh is in progress */
  refreshing?: boolean;
}

export interface MenuItemCardProps {
  /** The menu item to display */
  item: MenuItem;
  /** Quantity of this item in the current order */
  quantity?: number;
  /** Callback when pressed */
  onPress?: (item: MenuItem) => void;
  /** Callback when long pressed */
  onLongPress?: (item: MenuItem) => void;
  /** Display variant */
  variant: 'grid' | 'list';
  /** Whether to show description */
  showDescription?: boolean;
  /** Whether to show image */
  showImage?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// Constants
// ============================================================================

const TABLET_BREAKPOINT = 768;
const DEFAULT_COLUMNS_PHONE = 2;
const DEFAULT_COLUMNS_TABLET = 3;
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/150?text=No+Image';

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
 * Parse price string to number
 */
export function parsePrice(price: string | undefined): number {
  if (!price) return 0;
  const parsed = Number.parseFloat(price);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}

/**
 * Get the display price formatted
 */
export function getFormattedPrice(price: string | undefined): string {
  return `$${formatPrice(parsePrice(price))}`;
}

// ============================================================================
// Menu Item Card Component
// ============================================================================

export function MenuItemCard({
  item,
  quantity = 0,
  onPress,
  onLongPress,
  variant,
  showDescription = true,
  showImage = true,
  testID,
}: MenuItemCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const scale = useSharedValue(1);

  const isUnavailable = !item.isActive;

  const handlePressIn = () => {
    if (!isUnavailable) {
      scale.value = withSpring(0.98);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = useCallback(() => {
    if (!isUnavailable && onPress) {
      onPress(item);
    }
  }, [isUnavailable, onPress, item]);

  const handleLongPress = useCallback(() => {
    if (!isUnavailable && onLongPress) {
      onLongPress(item);
    }
  }, [isUnavailable, onLongPress, item]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const imageSource = item.imagePath ? { uri: item.imagePath } : { uri: PLACEHOLDER_IMAGE };

  // Grid variant layout
  if (variant === 'grid') {
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          testID={testID ?? `menu-item-card-${item.id}`}
          style={[
            styles.gridCard,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              opacity: isUnavailable ? 0.5 : 1,
            },
          ]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isUnavailable && !onLongPress}
          activeOpacity={0.8}
        >
          {/* Quantity badge */}
          {quantity > 0 && (
            <View
              testID={`quantity-badge-${item.id}`}
              style={[styles.quantityBadge, { backgroundColor: BrandColors.primary }]}
            >
              <ThemedText style={styles.quantityBadgeText}>{quantity}</ThemedText>
            </View>
          )}

          {/* Image */}
          {showImage && (
            <View style={styles.gridImageContainer}>
              <Image
                testID={`menu-item-image-${item.id}`}
                source={imageSource}
                style={styles.gridImage}
                contentFit="cover"
                placeholder={PLACEHOLDER_IMAGE}
                transition={200}
              />
            </View>
          )}

          {/* Content */}
          <View style={styles.gridContent}>
            <ThemedText style={styles.gridTitle} numberOfLines={2}>
              {getTranslatedText(item.title)}
            </ThemedText>

            {showDescription && item.description && (
              <ThemedText
                style={[styles.gridDescription, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {getTranslatedText(item.description)}
              </ThemedText>
            )}

            <ThemedText style={[styles.gridPrice, { color: BrandColors.primary }]}>
              {getFormattedPrice(item.price)}
            </ThemedText>
          </View>

          {/* Unavailable overlay */}
          {isUnavailable && (
            <View style={[styles.unavailableOverlay, { backgroundColor: colors.overlay }]}>
              <ThemedText style={styles.unavailableText}>Unavailable</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // List variant layout
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        testID={testID ?? `menu-item-card-${item.id}`}
        style={[
          styles.listCard,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            opacity: isUnavailable ? 0.5 : 1,
          },
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isUnavailable && !onLongPress}
        activeOpacity={0.8}
      >
        {/* Quantity badge */}
        {quantity > 0 && (
          <View
            testID={`quantity-badge-${item.id}`}
            style={[styles.quantityBadgeList, { backgroundColor: BrandColors.primary }]}
          >
            <ThemedText style={styles.quantityBadgeText}>{quantity}</ThemedText>
          </View>
        )}

        {/* Image */}
        {showImage && (
          <Image
            testID={`menu-item-image-${item.id}`}
            source={imageSource}
            style={styles.listImage}
            contentFit="cover"
            placeholder={PLACEHOLDER_IMAGE}
            transition={200}
          />
        )}

        {/* Content */}
        <View style={styles.listContent}>
          <View style={styles.listHeader}>
            <ThemedText style={styles.listTitle} numberOfLines={1}>
              {getTranslatedText(item.title)}
            </ThemedText>
            <ThemedText style={[styles.listPrice, { color: BrandColors.primary }]}>
              {getFormattedPrice(item.price)}
            </ThemedText>
          </View>

          {showDescription && item.description && (
            <ThemedText
              style={[styles.listDescription, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {getTranslatedText(item.description)}
            </ThemedText>
          )}
        </View>

        {/* Unavailable overlay */}
        {isUnavailable && (
          <View style={[styles.unavailableOverlayList, { backgroundColor: colors.overlay }]}>
            <ThemedText style={styles.unavailableText}>Unavailable</ThemedText>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  message: string;
  testID?: string;
}

function EmptyState({ message, testID }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.emptyState} testID={testID ?? 'menu-item-list-empty'}>
      <ThemedText style={[styles.emptyStateText, { color: colors.textMuted }]}>
        {message}
      </ThemedText>
    </View>
  );
}

// ============================================================================
// Main MenuItemList Component
// ============================================================================

export function MenuItemList({
  items,
  itemQuantities = {},
  onItemPress,
  onItemLongPress,
  variant = 'auto',
  numColumns,
  showDescription = true,
  showImages = true,
  emptyMessage = 'No items found',
  testID = 'menu-item-list',
  onRefresh,
  refreshing = false,
}: MenuItemListProps) {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Determine if tablet or phone
  const isTablet = width >= TABLET_BREAKPOINT;

  // Determine display variant
  const displayVariant: 'grid' | 'list' = useMemo(() => {
    if (variant === 'auto') {
      return 'grid'; // Default to grid, let columns handle phone vs tablet
    }
    return variant;
  }, [variant]);

  // Determine number of columns
  const columns = useMemo(() => {
    if (displayVariant === 'list') return 1;
    if (numColumns) return numColumns;
    return isTablet ? DEFAULT_COLUMNS_TABLET : DEFAULT_COLUMNS_PHONE;
  }, [displayVariant, numColumns, isTablet]);

  // Render item
  const renderItem = useCallback(
    ({ item }: { item: MenuItem }) => {
      const quantity = itemQuantities[item.id] || 0;

      return (
        <View style={displayVariant === 'grid' ? styles.gridCell : styles.listCell}>
          <MenuItemCard
            item={item}
            quantity={quantity}
            onPress={onItemPress}
            onLongPress={onItemLongPress}
            variant={displayVariant}
            showDescription={showDescription}
            showImage={showImages}
          />
        </View>
      );
    },
    [itemQuantities, onItemPress, onItemLongPress, displayVariant, showDescription, showImages]
  );

  // Key extractor
  const keyExtractor = useCallback((item: MenuItem) => item.id, []);

  // Empty component
  const ListEmptyComponent = useCallback(
    () => <EmptyState message={emptyMessage} />,
    [emptyMessage]
  );

  if (items.length === 0) {
    return <EmptyState message={emptyMessage} testID={testID} />;
  }

  return (
    <View testID={testID} style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={columns}
        key={`menu-list-${columns}`} // Force re-render when columns change
        contentContainerStyle={[
          styles.listContainer,
          displayVariant === 'grid' && styles.gridContainer,
        ]}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={ListEmptyComponent}
        onRefresh={onRefresh}
        refreshing={refreshing}
        style={{ backgroundColor: colors.background }}
      />
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  gridContainer: {
    gap: Spacing.md,
  },
  columnWrapper: {
    gap: Spacing.md,
  },
  gridCell: {
    flex: 1,
  },
  listCell: {
    marginBottom: Spacing.md,
  },
  // Grid Card Styles
  gridCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImageContainer: {
    aspectRatio: 16 / 10,
    width: '100%',
    backgroundColor: '#F3F4F6',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridContent: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  gridDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  gridPrice: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  // List Card Styles
  listCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  listImage: {
    width: 80,
    height: 80,
  },
  listContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  listTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  listDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  listPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Quantity Badge
  quantityBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  quantityBadgeList: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  quantityBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Unavailable Overlay
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  unavailableOverlayList: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  unavailableText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing.lg,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MenuItemList;
