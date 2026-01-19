/**
 * Cancel Order Modal Component
 *
 * Modal for cancelling an order with a reason.
 * Features:
 * - List of reason templates from API
 * - Custom reason input option
 * - Loading state during API call
 * - Error display with retry option
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BorderRadius, BrandColors, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCancellationReasons } from '@/src/hooks/useReasonTemplateQueries';
import type { ReasonTemplate } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

export interface CancelOrderModalProps {
  visible: boolean;
  orderCode: string;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
  testID?: string;
}

// ============================================================================
// Reason Item Component
// ============================================================================

interface ReasonItemProps {
  reason: ReasonTemplate;
  isSelected: boolean;
  onSelect: (reason: ReasonTemplate) => void;
}

function ReasonItem({ reason, isSelected, onSelect }: ReasonItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={() => onSelect(reason)}
      style={({ pressed }) => [
        styles.reasonItem,
        {
          backgroundColor: isSelected
            ? `${StatusColors.needsAttention}15`
            : pressed
              ? colors.backgroundSecondary
              : colors.background,
          borderColor: isSelected ? StatusColors.needsAttention : colors.border,
        },
      ]}
    >
      <View style={styles.reasonItemContent}>
        <ThemedText style={[styles.reasonName, { color: colors.text }]}>{reason.name}</ThemedText>
        {reason.description && (
          <ThemedText style={[styles.reasonDescription, { color: colors.textSecondary }]}>
            {reason.description}
          </ThemedText>
        )}
      </View>
      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: StatusColors.needsAttention }]}>
          <ThemedText style={styles.checkmark}>✓</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CancelOrderModal({
  visible,
  orderCode,
  onConfirm,
  onCancel,
  testID = 'cancel-order-modal',
}: CancelOrderModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [selectedReason, setSelectedReason] = useState<ReasonTemplate | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [useCustomReason, setUseCustomReason] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cancellation reasons
  const { data: reasonsData, isLoading } = useCancellationReasons();

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setCustomReason('');
      setUseCustomReason(false);
      setError(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  // Get reason templates
  const reasonTemplates = useMemo(() => {
    return reasonsData?.data ?? [];
  }, [reasonsData]);

  // Handle reason selection
  const handleSelectReason = useCallback((reason: ReasonTemplate) => {
    setSelectedReason(reason);
    setUseCustomReason(false);
    setCustomReason('');
    setError(null);
  }, []);

  // Handle custom reason toggle
  const handleUseCustomReason = useCallback(() => {
    setUseCustomReason(true);
    setSelectedReason(null);
    setError(null);
  }, []);

  // Get the final reason string
  const getFinalReason = useCallback(() => {
    if (useCustomReason) {
      return customReason.trim();
    }
    return selectedReason?.name ?? '';
  }, [useCustomReason, customReason, selectedReason]);

  // Check if can submit
  const canSubmit = useMemo(() => {
    if (useCustomReason) {
      return customReason.trim().length > 0;
    }
    return selectedReason !== null;
  }, [useCustomReason, customReason, selectedReason]);

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    const reason = getFinalReason();
    if (!reason) {
      setError('Please select or enter a cancellation reason');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(reason);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
      setIsSubmitting(false);
    }
  }, [getFinalReason, onConfirm]);

  // Handle backdrop press
  const handleBackdropPress = useCallback(() => {
    if (!isSubmitting) {
      onCancel();
    }
  }, [isSubmitting, onCancel]);

  // Render reason item
  const renderReasonItem = useCallback(
    ({ item }: { item: ReasonTemplate }) => (
      <ReasonItem
        reason={item}
        isSelected={selectedReason?.id === item.id}
        onSelect={handleSelectReason}
      />
    ),
    [selectedReason, handleSelectReason]
  );

  const keyExtractor = useCallback((item: ReasonTemplate) => item.id, []);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent testID={testID}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.overlay}
        >
          <Pressable
            style={styles.backdrop}
            onPress={handleBackdropPress}
            testID={`${testID}-backdrop`}
          />
          <Animated.View
            entering={SlideInDown.duration(300).springify().damping(15)}
            exiting={SlideOutDown.duration(200)}
            style={[
              styles.container,
              {
                backgroundColor: colors.background,
                shadowColor: '#000',
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.warningIcon, { backgroundColor: StatusColors.needsAttention }]}>
                <ThemedText style={styles.warningIconText}>!</ThemedText>
              </View>
              <ThemedText style={[styles.title, { color: colors.text }]}>Cancel Order</ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                Are you sure you want to cancel order {orderCode}?
              </ThemedText>
            </View>

            {/* Reason Selection */}
            <View style={styles.reasonSection}>
              <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>
                Select a reason:
              </ThemedText>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                  <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Loading reasons...
                  </ThemedText>
                </View>
              ) : (
                <FlatList
                  data={reasonTemplates}
                  renderItem={renderReasonItem}
                  keyExtractor={keyExtractor}
                  style={styles.reasonList}
                  contentContainerStyle={styles.reasonListContent}
                  showsVerticalScrollIndicator={false}
                  testID={`${testID}-reason-list`}
                  ListEmptyComponent={
                    <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>
                      No preset reasons available
                    </ThemedText>
                  }
                />
              )}

              {/* Custom Reason Option */}
              <Pressable
                onPress={handleUseCustomReason}
                style={({ pressed }) => [
                  styles.customReasonToggle,
                  {
                    backgroundColor: useCustomReason
                      ? `${StatusColors.needsAttention}15`
                      : pressed
                        ? colors.backgroundSecondary
                        : colors.background,
                    borderColor: useCustomReason ? StatusColors.needsAttention : colors.border,
                  },
                ]}
              >
                <ThemedText style={[styles.customReasonLabel, { color: colors.text }]}>
                  Enter custom reason
                </ThemedText>
                {useCustomReason && (
                  <View
                    style={[
                      styles.selectedIndicator,
                      { backgroundColor: StatusColors.needsAttention },
                    ]}
                  >
                    <ThemedText style={styles.checkmark}>✓</ThemedText>
                  </View>
                )}
              </Pressable>

              {/* Custom Reason Input */}
              {useCustomReason && (
                <View
                  style={[
                    styles.customReasonInput,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    value={customReason}
                    onChangeText={setCustomReason}
                    placeholder="Enter cancellation reason..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    maxLength={200}
                    editable={!isSubmitting}
                    style={[styles.customReasonTextInput, { color: colors.text }]}
                    testID={`${testID}-custom-reason-input`}
                  />
                </View>
              )}
            </View>

            {/* Error Message */}
            {error && (
              <Card
                padding="sm"
                style={[styles.errorCard, { backgroundColor: colors.errorBackground }]}
              >
                <ThemedText style={[styles.errorText, { color: colors.error }]}>{error}</ThemedText>
              </Card>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <Button
                variant="outline"
                size="lg"
                onPress={onCancel}
                disabled={isSubmitting}
                style={styles.button}
                testID={`${testID}-cancel-button`}
              >
                Keep Order
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onPress={handleConfirm}
                disabled={isSubmitting || !canSubmit}
                style={styles.button}
                testID={`${testID}-confirm-button`}
              >
                {isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : 'Cancel Order'}
              </Button>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    maxHeight: '85%',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  warningIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  warningIconText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  reasonSection: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  reasonList: {
    maxHeight: 180,
    marginBottom: Spacing.sm,
  },
  reasonListContent: {
    gap: Spacing.sm,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  reasonItemContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  reasonName: {
    fontSize: 15,
    fontWeight: '500',
  },
  reasonDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  customReasonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginTop: Spacing.xs,
  },
  customReasonLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  customReasonInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    minHeight: 80,
  },
  customReasonTextInput: {
    padding: Spacing.md,
    fontSize: 15,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorCard: {
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
  },
});
