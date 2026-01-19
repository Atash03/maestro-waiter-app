/**
 * Haptic Feedback Utilities
 *
 * Centralized haptic feedback module for consistent haptic interactions.
 * Uses expo-haptics for cross-platform haptic feedback.
 *
 * Features:
 * - Impact feedback (light, medium, heavy) for UI interactions
 * - Notification feedback (success, warning, error) for status updates
 * - Selection feedback for picker/selection changes
 * - Platform-aware (disabled on web, graceful degradation)
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Check if haptics are supported on the current platform
 */
const isHapticsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Impact feedback styles for UI interactions
 */
export type ImpactStyle = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';

/**
 * Notification feedback types for status updates
 */
export type NotificationType = 'success' | 'warning' | 'error';

/**
 * Map our impact styles to expo-haptics styles
 */
const impactStyleMap: Record<ImpactStyle, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
  soft: Haptics.ImpactFeedbackStyle.Soft,
  rigid: Haptics.ImpactFeedbackStyle.Rigid,
};

/**
 * Map our notification types to expo-haptics types
 */
const notificationTypeMap: Record<NotificationType, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

/**
 * Trigger impact haptic feedback
 *
 * Use for UI interactions like:
 * - Button presses (light)
 * - Tab switches (light)
 * - Slider movements (light)
 * - Toggles (medium)
 * - Significant actions (heavy)
 *
 * @param style - The impact style (light, medium, heavy, soft, rigid)
 */
export async function impactFeedback(style: ImpactStyle = 'light'): Promise<void> {
  if (!isHapticsSupported) return;

  try {
    await Haptics.impactAsync(impactStyleMap[style]);
  } catch {
    // Silently fail - haptics are non-critical
  }
}

/**
 * Trigger notification haptic feedback
 *
 * Use for status updates like:
 * - Success (success) - after completing actions
 * - Warning (warning) - for important alerts
 * - Error (error) - for failures
 *
 * @param type - The notification type (success, warning, error)
 */
export async function notificationFeedback(type: NotificationType): Promise<void> {
  if (!isHapticsSupported) return;

  try {
    await Haptics.notificationAsync(notificationTypeMap[type]);
  } catch {
    // Silently fail - haptics are non-critical
  }
}

/**
 * Trigger selection change haptic feedback
 *
 * Use for discrete value changes like:
 * - Picker value changes
 * - Segment control changes
 * - Stepper value changes
 */
export async function selectionFeedback(): Promise<void> {
  if (!isHapticsSupported) return;

  try {
    await Haptics.selectionAsync();
  } catch {
    // Silently fail - haptics are non-critical
  }
}

// ============================================================================
// Convenience functions for common interactions
// ============================================================================

/**
 * Light impact for button presses
 */
export async function buttonPress(): Promise<void> {
  return impactFeedback('light');
}

/**
 * Medium impact for significant button presses (submit, confirm, etc.)
 */
export async function buttonPressSignificant(): Promise<void> {
  return impactFeedback('medium');
}

/**
 * Success feedback for completed actions
 */
export async function success(): Promise<void> {
  return notificationFeedback('success');
}

/**
 * Warning feedback for important alerts
 */
export async function warning(): Promise<void> {
  return notificationFeedback('warning');
}

/**
 * Error feedback for failures
 */
export async function error(): Promise<void> {
  return notificationFeedback('error');
}

/**
 * Feedback for pull-to-refresh trigger
 */
export async function pullToRefresh(): Promise<void> {
  return impactFeedback('light');
}

/**
 * Feedback for swipe action threshold reached
 */
export async function swipeThreshold(): Promise<void> {
  return impactFeedback('medium');
}

/**
 * Feedback for swipe action completion
 */
export async function swipeComplete(): Promise<void> {
  return notificationFeedback('success');
}

/**
 * Feedback for tab/segment switch
 */
export async function tabSwitch(): Promise<void> {
  return impactFeedback('light');
}

/**
 * Feedback for modal open
 */
export async function modalOpen(): Promise<void> {
  return impactFeedback('light');
}

/**
 * Feedback for modal close
 */
export async function modalClose(): Promise<void> {
  return impactFeedback('light');
}

/**
 * Feedback for toggle switch
 */
export async function toggle(): Promise<void> {
  return impactFeedback('medium');
}

/**
 * Feedback for long press trigger
 */
export async function longPress(): Promise<void> {
  return impactFeedback('heavy');
}

// ============================================================================
// Export as namespace for cleaner usage
// ============================================================================

export const haptics = {
  // Core functions
  impact: impactFeedback,
  notification: notificationFeedback,
  selection: selectionFeedback,

  // Convenience functions
  buttonPress,
  buttonPressSignificant,
  success,
  warning,
  error,
  pullToRefresh,
  swipeThreshold,
  swipeComplete,
  tabSwitch,
  modalOpen,
  modalClose,
  toggle,
  longPress,

  // Constants
  isSupported: isHapticsSupported,
};

export default haptics;
