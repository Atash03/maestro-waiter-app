/**
 * Edit Notes Modal Component
 *
 * Modal for adding or editing order notes.
 * Features:
 * - Text input with character counter
 * - Loading state during API call
 * - Error display with retry option
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ============================================================================
// Types
// ============================================================================

export interface EditNotesModalProps {
  visible: boolean;
  currentNotes: string | undefined;
  onConfirm: (notes: string) => Promise<void>;
  onCancel: () => void;
  maxLength?: number;
  testID?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_LENGTH = 500;

// ============================================================================
// Main Component
// ============================================================================

export function EditNotesModal({
  visible,
  currentNotes,
  onConfirm,
  onCancel,
  maxLength = DEFAULT_MAX_LENGTH,
  testID = 'edit-notes-modal',
}: EditNotesModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [notes, setNotes] = useState(currentNotes ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setNotes(currentNotes ?? '');
      setError(null);
      setIsSubmitting(false);
    }
  }, [visible, currentNotes]);

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(notes.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notes');
      setIsSubmitting(false);
    }
  }, [notes, onConfirm]);

  // Handle backdrop press
  const handleBackdropPress = useCallback(() => {
    if (!isSubmitting) {
      onCancel();
    }
  }, [isSubmitting, onCancel]);

  // Check if notes have changed
  const hasChanges = notes.trim() !== (currentNotes ?? '').trim();
  const remainingChars = maxLength - notes.length;

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
              <ThemedText style={[styles.title, { color: colors.text }]}>
                {currentNotes ? 'Edit Notes' : 'Add Notes'}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                Add special instructions or notes for this order
              </ThemedText>
            </View>

            {/* Text Input */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: error ? colors.error : colors.border,
                },
              ]}
            >
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Enter notes here..."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={maxLength}
                editable={!isSubmitting}
                style={[styles.input, { color: colors.text }]}
                testID={`${testID}-input`}
              />
            </View>

            {/* Character Counter */}
            <View style={styles.counterContainer}>
              <ThemedText
                style={[
                  styles.counter,
                  {
                    color: remainingChars < 50 ? colors.warning : colors.textMuted,
                  },
                ]}
              >
                {remainingChars} characters remaining
              </ThemedText>
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
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                onPress={handleConfirm}
                disabled={isSubmitting || !hasChanges}
                style={styles.button}
                testID={`${testID}-confirm-button`}
              >
                {isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : 'Save Notes'}
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
  inputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    minHeight: 120,
    marginBottom: Spacing.xs,
  },
  input: {
    padding: Spacing.md,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  counterContainer: {
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  counter: {
    fontSize: 12,
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
