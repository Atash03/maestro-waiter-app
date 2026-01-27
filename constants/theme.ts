/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Brand colors from PRD
export const BrandColors = {
  primary: '#F94623',
  primaryLight: '#FB6E4F',
  primaryDark: '#D63D1E',
} as const;

// Status colors for various UI states
export const StatusColors = {
  available: '#22C55E',
  occupied: '#F59E0B',
  reserved: '#3B82F6',
  needsAttention: '#EF4444',
  ready: '#10B981',
  preparing: '#F97316',
  pending: '#6B7280',
} as const;

// Accent strip colors for order cards (status-based)
export const OrderAccentColors = {
  inProgress: '#FFBA18',
  completed: '#2B9A66',
  cancelled: '#CE2C31',
  pending: '#9CA3AF',
} as const;

// Order status badge colors (text + background per theme)
export const OrderStatusBadgeColors = {
  light: {
    inProgress: { text: '#E2A336', bg: '#F6EEE7' },
    completed: { text: '#2B9A66', bg: '#E6F4ED' },
    cancelled: { text: '#CE2C31', bg: '#FBEAEA' },
    pending: { text: '#6B7280', bg: '#F3F4F6' },
  },
  dark: {
    inProgress: { text: '#FFBA18', bg: '#3D2E0A' },
    completed: { text: '#2B9A66', bg: '#0A2E1A' },
    cancelled: { text: '#CE2C31', bg: '#2E0A0A' },
    pending: { text: '#9CA3AF', bg: '#2D3133' },
  },
} as const;

// Category colors for menu items
export const CategoryColors = {
  kitchen: '#F97316',
  bar: '#3B82F6',
} as const;

// Spacing based on 4px grid
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

// Border radius values
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

const tintColorLight = BrandColors.primary;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    border: '#E5E7EB',
    borderFocused: BrandColors.primary,
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    error: '#DC2626',
    errorBackground: '#FEE2E2',
    success: '#22C55E',
    successBackground: '#DCFCE7',
    warning: '#F59E0B',
    warningBackground: '#FEF3C7',
    info: '#3B82F6',
    infoBackground: '#DBEAFE',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    textMuted: '#687076',
    background: '#151718',
    backgroundSecondary: '#1E2021',
    border: '#2D3133',
    borderFocused: BrandColors.primaryLight,
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    error: '#EF4444',
    errorBackground: '#450A0A',
    success: '#22C55E',
    successBackground: '#052E16',
    warning: '#F59E0B',
    warningBackground: '#422006',
    info: '#3B82F6',
    infoBackground: '#1E3A5F',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
