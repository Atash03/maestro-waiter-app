/**
 * Change Table Modal Component
 *
 * Modal for changing the table assigned to an order.
 * Features:
 * - List of available tables
 * - Current table highlighted
 * - Loading state during API call
 * - Error display with retry option
 */

import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BorderRadius, BrandColors, Colors, Spacing, StatusColors } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { useTables } from '@/src/hooks/useTableQueries';
import type { Table } from '@/src/types/models';

// ============================================================================
// Types
// ============================================================================

export interface ChangeTableModalProps {
  visible: boolean;
  currentTableId: string | null;
  onConfirm: (newTableId: string) => Promise<void>;
  onCancel: () => void;
  testID?: string;
}

// ============================================================================
// Table Item Component
// ============================================================================

interface TableItemProps {
  table: Table;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: (tableId: string) => void;
}

function TableItem({ table, isSelected, isCurrent, onSelect }: TableItemProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={() => onSelect(table.id)}
      style={({ pressed }) => [
        styles.tableItem,
        {
          backgroundColor: isSelected
            ? `${BrandColors.primary}15`
            : pressed
              ? colors.backgroundSecondary
              : colors.background,
          borderColor: isSelected ? BrandColors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.tableItemContent}>
        <ThemedText style={[styles.tableName, { color: colors.text }]}>{table.title}</ThemedText>
        <ThemedText style={[styles.tableCapacity, { color: colors.textSecondary }]}>
          Seats {table.capacity}
        </ThemedText>
      </View>
      {isCurrent && (
        <View style={[styles.currentBadge, { backgroundColor: StatusColors.occupied }]}>
          <ThemedText style={styles.currentBadgeText}>Current</ThemedText>
        </View>
      )}
      {isSelected && !isCurrent && (
        <View style={[styles.selectedIndicator, { backgroundColor: BrandColors.primary }]}>
          <ThemedText style={styles.checkmark}>✓</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChangeTableModal({
  visible,
  currentTableId,
  onConfirm,
  onCancel,
  testID = 'change-table-modal',
}: ChangeTableModalProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tables
  const { data: tablesData, isLoading } = useTables();

  // Get all tables
  const availableTables = useMemo(() => {
    if (!tablesData?.data) return [];
    return tablesData.data;
  }, [tablesData]);

  // Reset state when modal opens
  const handleModalShow = useCallback(() => {
    setSelectedTableId(null);
    setError(null);
    setIsSubmitting(false);
  }, []);

  // Handle table selection
  const handleSelectTable = useCallback((tableId: string) => {
    setSelectedTableId(tableId);
    setError(null);
  }, []);

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    if (!selectedTableId || selectedTableId === currentTableId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(selectedTableId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change table');
      setIsSubmitting(false);
    }
  }, [selectedTableId, currentTableId, onConfirm]);

  // Handle backdrop press
  const handleBackdropPress = useCallback(() => {
    if (!isSubmitting) {
      onCancel();
    }
  }, [isSubmitting, onCancel]);

  // Render table item
  const renderTableItem = useCallback(
    ({ item }: { item: Table }) => (
      <TableItem
        table={item}
        isSelected={selectedTableId === item.id}
        isCurrent={currentTableId === item.id}
        onSelect={handleSelectTable}
      />
    ),
    [selectedTableId, currentTableId, handleSelectTable]
  );

  const keyExtractor = useCallback((item: Table) => item.id, []);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={handleModalShow}
      testID={testID}
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
          entering={SlideInDown.duration(300).springify()}
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
            <ThemedText style={[styles.title, { color: colors.text }]}>Change Table</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Select a new table for this order
            </ThemedText>
          </View>

          {/* Table List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading tables...
              </ThemedText>
            </View>
          ) : availableTables.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>
                No tables available
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={availableTables}
              renderItem={renderTableItem}
              keyExtractor={keyExtractor}
              style={styles.tableList}
              contentContainerStyle={styles.tableListContent}
              showsVerticalScrollIndicator={false}
              testID={`${testID}-table-list`}
            />
          )}

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
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              onPress={handleConfirm}
              disabled={isSubmitting || !selectedTableId || selectedTableId === currentTableId}
              style={styles.button}
              testID={`${testID}-confirm-button`}
            >
              {isSubmitting ? 'Changing...' : 'Change Table'}
            </Button>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
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
    maxHeight: '80%',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    marginBottom: Spacing.lg,
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  loadingText: {
    fontSize: 14,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyText: {
    fontSize: 14,
  },
  tableList: {
    maxHeight: 300,
    marginBottom: Spacing.lg,
  },
  tableListContent: {
    gap: Spacing.sm,
  },
  tableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  tableItemContent: {
    flex: 1,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '600',
  },
  tableCapacity: {
    fontSize: 13,
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
