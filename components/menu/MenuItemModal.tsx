/**
 * Menu Item Detail Modal Component
 *
 * Modal for viewing menu item details and adding to order.
 *
 * Features:
 * - Large image with description
 * - Price display
 * - Quantity selector with +/- buttons
 * - Available extras with checkboxes and quantities
 * - Notes field for special requests (max 500 chars)
 * - "Add to Order" button with animation
 * - "Duplicate" button for repeat orders
 */

import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BorderRadius, BrandColors, CategoryColors, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MenuCategoryType } from '@/src/types/enums';
import type { Extra, MenuItem, OrderItemExtra, Translation } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

export interface MenuItemModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The menu item to display */
  item: MenuItem | null;
  /** Available extras for the item */
  availableExtras?: Extra[];
  /** Callback when adding item to order */
  onAddToOrder?: (
    item: MenuItem,
    quantity: number,
    selectedExtras: SelectedExtra[],
    notes: string
  ) => void;
  /** Callback when duplicating an existing order item */
  onDuplicate?: (
    item: MenuItem,
    quantity: number,
    selectedExtras: SelectedExtra[],
    notes: string
  ) => void;
  /** Initial quantity (for editing existing order items) */
  initialQuantity?: number;
  /** Initial extras (for editing existing order items) */
  initialExtras?: OrderItemExtra[];
  /** Initial notes (for editing existing order items) */
  initialNotes?: string;
  /** Whether this is editing an existing item */
  isEditing?: boolean;
  /** Test ID for testing */
  testID?: string;
}

export interface SelectedExtra {
  extraId: string;
  quantity: number;
  extra: Extra;
}

// ============================================================================
// Constants
// ============================================================================

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/300?text=No+Image';
const MAX_NOTES_LENGTH = 500;
const MAX_QUANTITY = 99;
const MIN_QUANTITY = 1;

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
 * Get formatted price with currency symbol
 */
export function getFormattedPrice(price: string | undefined): string {
  return `$${formatPrice(parsePrice(price))}`;
}

/**
 * Calculate total price for selected extras
 */
export function calculateExtrasTotal(selectedExtras: SelectedExtra[]): number {
  return selectedExtras.reduce((total, selectedExtra) => {
    return total + parsePrice(selectedExtra.extra.actualPrice) * selectedExtra.quantity;
  }, 0);
}

/**
 * Calculate total price for item with extras
 */
export function calculateItemTotal(
  itemPrice: string | undefined,
  quantity: number,
  selectedExtras: SelectedExtra[]
): number {
  const basePrice = parsePrice(itemPrice);
  const extrasPrice = calculateExtrasTotal(selectedExtras);
  return (basePrice + extrasPrice) * quantity;
}

/**
 * Get category color based on type
 */
export function getCategoryColor(type: string | undefined): string {
  if (type === 'Kitchen') return CategoryColors.kitchen;
  if (type === 'Bar') return CategoryColors.bar;
  return CategoryColors.kitchen;
}

// ============================================================================
// Animated Components
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// Extra Item Component
// ============================================================================

interface ExtraItemProps {
  extra: Extra;
  isSelected: boolean;
  quantity: number;
  onToggle: (extra: Extra) => void;
  onQuantityChange: (extraId: string, quantity: number) => void;
  testID?: string;
}

function ExtraItem({
  extra,
  isSelected,
  quantity,
  onToggle,
  onQuantityChange,
  testID,
}: ExtraItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      testID={testID ?? `extra-item-${extra.id}`}
      style={[
        styles.extraItem,
        { borderColor: isSelected ? BrandColors.primary : colors.border },
        isSelected && styles.extraItemSelected,
      ]}
    >
      <TouchableOpacity
        testID={`extra-toggle-${extra.id}`}
        style={styles.extraCheckbox}
        onPress={() => onToggle(extra)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isSelected ? BrandColors.primary : colors.border,
              backgroundColor: isSelected ? BrandColors.primary : 'transparent',
            },
          ]}
        >
          {isSelected && <ThemedText style={styles.checkmark}>✓</ThemedText>}
        </View>
        <View style={styles.extraInfo}>
          <ThemedText style={styles.extraTitle}>{getTranslatedText(extra.title)}</ThemedText>
          {extra.description && (
            <ThemedText style={[styles.extraDescription, { color: colors.textSecondary }]}>
              {getTranslatedText(extra.description)}
            </ThemedText>
          )}
          <ThemedText style={[styles.extraPrice, { color: BrandColors.primary }]}>
            +{getFormattedPrice(extra.actualPrice)}
          </ThemedText>
        </View>
      </TouchableOpacity>

      {/* Quantity controls for selected extras */}
      {isSelected && (
        <View style={styles.extraQuantityControls}>
          <TouchableOpacity
            testID={`extra-decrease-${extra.id}`}
            style={[styles.extraQuantityButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => onQuantityChange(extra.id, Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <ThemedText style={styles.extraQuantityButtonText}>−</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.extraQuantityText}>{quantity}</ThemedText>
          <TouchableOpacity
            testID={`extra-increase-${extra.id}`}
            style={[styles.extraQuantityButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => onQuantityChange(extra.id, quantity + 1)}
          >
            <ThemedText style={styles.extraQuantityButtonText}>+</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Main Menu Item Modal Component
// ============================================================================

export function MenuItemModal({
  visible,
  onClose,
  item,
  availableExtras = [],
  onAddToOrder,
  onDuplicate,
  initialQuantity = 1,
  initialExtras = [],
  initialNotes = '',
  isEditing = false,
  testID = 'menu-item-modal',
}: MenuItemModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Animation values
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  // State
  const [quantity, setQuantity] = useState(initialQuantity);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [notes, setNotes] = useState(initialNotes);

  // Filter extras to only show those available for this item
  const itemExtras = useMemo(() => {
    if (!item?.extras || item.extras.length === 0) {
      return availableExtras;
    }
    const itemExtraIds = new Set(item.extras.map((e) => e.id));
    return availableExtras.filter((extra) => itemExtraIds.has(extra.id));
  }, [item, availableExtras]);

  // Reset state when item changes or modal opens
  useEffect(() => {
    if (visible && item) {
      setQuantity(initialQuantity);
      setNotes(initialNotes);

      // Initialize selected extras from initialExtras
      const initialSelected: SelectedExtra[] = initialExtras
        .map((orderExtra) => {
          const extra = availableExtras.find((e) => e.id === orderExtra.extraId);
          if (extra) {
            return {
              extraId: orderExtra.extraId,
              quantity: orderExtra.quantity,
              extra,
            };
          }
          return null;
        })
        .filter((e): e is SelectedExtra => e !== null);

      setSelectedExtras(initialSelected);
    }
  }, [visible, item, initialQuantity, initialExtras, initialNotes, availableExtras]);

  // Animate modal entrance/exit
  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0.9, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, scale, opacity, backdropOpacity]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!item) return 0;
    return calculateItemTotal(item.price, quantity, selectedExtras);
  }, [item, quantity, selectedExtras]);

  // Handle quantity changes
  const handleIncreaseQuantity = useCallback(() => {
    setQuantity((prev) => Math.min(MAX_QUANTITY, prev + 1));
  }, []);

  const handleDecreaseQuantity = useCallback(() => {
    setQuantity((prev) => Math.max(MIN_QUANTITY, prev - 1));
  }, []);

  // Handle extra toggle
  const handleToggleExtra = useCallback((extra: Extra) => {
    setSelectedExtras((prev) => {
      const existingIndex = prev.findIndex((e) => e.extraId === extra.id);
      if (existingIndex >= 0) {
        // Remove extra
        return prev.filter((e) => e.extraId !== extra.id);
      }
      // Add extra with quantity 1
      return [...prev, { extraId: extra.id, quantity: 1, extra }];
    });
  }, []);

  // Handle extra quantity change
  const handleExtraQuantityChange = useCallback((extraId: string, newQuantity: number) => {
    setSelectedExtras((prev) =>
      prev.map((e) => (e.extraId === extraId ? { ...e, quantity: newQuantity } : e))
    );
  }, []);

  // Handle notes change
  const handleNotesChange = useCallback((text: string) => {
    if (text.length <= MAX_NOTES_LENGTH) {
      setNotes(text);
    }
  }, []);

  // Handle add to order
  const handleAddToOrder = useCallback(() => {
    if (!item || !onAddToOrder) return;

    // Button animation
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );

    onAddToOrder(item, quantity, selectedExtras, notes);
    onClose();
  }, [item, quantity, selectedExtras, notes, onAddToOrder, onClose, buttonScale]);

  // Handle duplicate
  const handleDuplicate = useCallback(() => {
    if (!item || !onDuplicate) return;

    onDuplicate(item, quantity, selectedExtras, notes);
    onClose();
  }, [item, quantity, selectedExtras, notes, onDuplicate, onClose]);

  // Animated styles
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Don't render if no item
  if (!item) return null;

  const imageSource = item.imagePath ? { uri: item.imagePath } : { uri: PLACEHOLDER_IMAGE };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <AnimatedPressable
          testID="menu-item-modal-backdrop"
          style={[styles.backdrop, { backgroundColor: colors.overlay }, backdropAnimatedStyle]}
          onPress={onClose}
        />

        {/* Content */}
        <Animated.View
          style={[styles.content, { backgroundColor: colors.background }, contentAnimatedStyle]}
        >
          {/* Close button */}
          <TouchableOpacity
            testID="menu-item-modal-close"
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close menu item details"
            accessibilityRole="button"
          >
            <ThemedText style={styles.closeButtonText}>✕</ThemedText>
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Image */}
            <View style={styles.imageContainer}>
              <Image
                testID="menu-item-modal-image"
                source={imageSource}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />

              {/* Category badge */}
              {item.category && (
                <Badge
                  testID="menu-item-modal-category"
                  variant={item.category.type === MenuCategoryType.BAR ? 'info' : 'warning'}
                  size="sm"
                  style={styles.categoryBadge}
                >
                  {item.category.type}
                </Badge>
              )}
            </View>

            {/* Title and description */}
            <View style={styles.itemInfo}>
              <ThemedText style={styles.title}>{getTranslatedText(item.title)}</ThemedText>

              {item.description && (
                <ThemedText style={[styles.description, { color: colors.textSecondary }]}>
                  {getTranslatedText(item.description)}
                </ThemedText>
              )}

              {/* Price */}
              <ThemedText style={[styles.price, { color: BrandColors.primary }]}>
                {getFormattedPrice(item.price)}
              </ThemedText>

              {/* Preparation time */}
              {item.timeForPreparation && (
                <ThemedText style={[styles.prepTime, { color: colors.textMuted }]}>
                  ⏱ Prep time: {item.timeForPreparation}
                </ThemedText>
              )}
            </View>

            {/* Quantity selector */}
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <ThemedText style={styles.sectionTitle}>Quantity</ThemedText>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  testID="quantity-decrease"
                  style={[
                    styles.quantityButton,
                    { backgroundColor: colors.backgroundSecondary },
                    quantity <= MIN_QUANTITY && styles.quantityButtonDisabled,
                  ]}
                  onPress={handleDecreaseQuantity}
                  disabled={quantity <= MIN_QUANTITY}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease quantity"
                  accessibilityState={{ disabled: quantity <= MIN_QUANTITY }}
                >
                  <ThemedText style={styles.quantityButtonText}>−</ThemedText>
                </TouchableOpacity>

                <ThemedText
                  testID="quantity-value"
                  style={styles.quantityValue}
                  accessibilityLabel={`Quantity: ${quantity}`}
                  accessibilityRole="text"
                >
                  {quantity}
                </ThemedText>

                <TouchableOpacity
                  testID="quantity-increase"
                  style={[
                    styles.quantityButton,
                    { backgroundColor: colors.backgroundSecondary },
                    quantity >= MAX_QUANTITY && styles.quantityButtonDisabled,
                  ]}
                  onPress={handleIncreaseQuantity}
                  disabled={quantity >= MAX_QUANTITY}
                  accessibilityRole="button"
                  accessibilityLabel="Increase quantity"
                  accessibilityState={{ disabled: quantity >= MAX_QUANTITY }}
                >
                  <ThemedText style={styles.quantityButtonText}>+</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Extras section */}
            {itemExtras.length > 0 && (
              <View style={[styles.section, { borderTopColor: colors.border }]}>
                <ThemedText style={styles.sectionTitle}>
                  Add Extras ({selectedExtras.length} selected)
                </ThemedText>
                <View style={styles.extrasList}>
                  {itemExtras.map((extra) => {
                    const selectedExtra = selectedExtras.find((e) => e.extraId === extra.id);
                    return (
                      <ExtraItem
                        key={extra.id}
                        extra={extra}
                        isSelected={Boolean(selectedExtra)}
                        quantity={selectedExtra?.quantity ?? 1}
                        onToggle={handleToggleExtra}
                        onQuantityChange={handleExtraQuantityChange}
                      />
                    );
                  })}
                </View>
              </View>
            )}

            {/* Notes section */}
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>Special Requests</ThemedText>
                <ThemedText style={[styles.notesCounter, { color: colors.textMuted }]}>
                  {notes.length}/{MAX_NOTES_LENGTH}
                </ThemedText>
              </View>
              <TextInput
                testID="notes-input"
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Add any special requests..."
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={handleNotesChange}
                multiline
                maxLength={MAX_NOTES_LENGTH}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Footer with total and action buttons */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {/* Total price */}
            <View style={styles.totalSection}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText
                testID="total-price"
                style={[styles.totalValue, { color: BrandColors.primary }]}
              >
                ${formatPrice(totalPrice)}
              </ThemedText>
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              {onDuplicate && !isEditing && (
                <Button
                  testID="duplicate-button"
                  variant="outline"
                  size="md"
                  onPress={handleDuplicate}
                  style={styles.duplicateButton}
                >
                  Duplicate
                </Button>
              )}

              <Animated.View style={[styles.addButtonContainer, buttonAnimatedStyle]}>
                <Button
                  testID="add-to-order-button"
                  variant="primary"
                  size="lg"
                  onPress={handleAddToOrder}
                  fullWidth
                >
                  {isEditing ? 'Update Order' : 'Add to Order'}
                </Button>
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    maxHeight: '90%',
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  imageContainer: {
    aspectRatio: 16 / 9,
    width: '100%',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  itemInfo: {
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  prepTime: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityButtonText: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'center',
  },
  extrasList: {
    gap: Spacing.md,
  },
  extraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  extraItemSelected: {
    backgroundColor: 'rgba(249, 70, 35, 0.05)',
  },
  extraCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  extraInfo: {
    flex: 1,
  },
  extraTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  extraDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  extraPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  extraQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: Spacing.md,
  },
  extraQuantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraQuantityButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  extraQuantityText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  notesCounter: {
    fontSize: 12,
  },
  notesInput: {
    height: 80,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: 1,
    gap: Spacing.lg,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  duplicateButton: {
    flex: 0,
    minWidth: 100,
  },
  addButtonContainer: {
    flex: 1,
  },
});

export default MenuItemModal;
