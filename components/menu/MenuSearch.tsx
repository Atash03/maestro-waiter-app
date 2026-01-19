/**
 * Menu Search Component
 *
 * A prominent search bar for filtering menu items with real-time filtering,
 * recent searches history, and optional voice search support.
 *
 * Features:
 * - Prominent search bar at top
 * - Real-time filtering as user types
 * - Search across name and description
 * - Recent searches history (persisted)
 * - Clear button to reset search
 * - Debounced search to improve performance
 * - Theme-aware colors (light/dark mode)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, BrandColors, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of recent searches to store */
const MAX_RECENT_SEARCHES = 10;

/** AsyncStorage key for recent searches */
const RECENT_SEARCHES_STORAGE_KEY = '@maestro_recent_menu_searches';

/** Debounce delay in milliseconds */
const DEBOUNCE_DELAY = 300;

// ============================================================================
// Types
// ============================================================================

export interface MenuSearchProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes (debounced) */
  onChangeText: (text: string) => void;
  /** Callback when search is submitted (Enter key) */
  onSubmit?: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show recent searches dropdown */
  showRecentSearches?: boolean;
  /** Maximum number of recent searches to display */
  maxRecentSearches?: number;
  /** Whether to auto-focus the input on mount */
  autoFocus?: boolean;
  /** Whether the search is disabled */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
  /** Additional TextInput props */
  inputProps?: Partial<TextInputProps>;
}

export interface RecentSearchItem {
  query: string;
  timestamp: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Load recent searches from AsyncStorage
 */
export async function loadRecentSearches(): Promise<RecentSearchItem[]> {
  try {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Silently ignore storage errors
  }
  return [];
}

/**
 * Save recent searches to AsyncStorage
 */
export async function saveRecentSearches(searches: RecentSearchItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Add a search to recent searches
 */
export function addToRecentSearches(
  searches: RecentSearchItem[],
  query: string,
  maxSearches: number = MAX_RECENT_SEARCHES
): RecentSearchItem[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return searches;

  // Remove existing entry with same query (case insensitive)
  const filtered = searches.filter(
    (item) => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
  );

  // Add new entry at the beginning
  const newSearches = [{ query: trimmedQuery, timestamp: Date.now() }, ...filtered].slice(
    0,
    maxSearches
  );

  return newSearches;
}

/**
 * Remove a search from recent searches
 */
export function removeFromRecentSearches(
  searches: RecentSearchItem[],
  query: string
): RecentSearchItem[] {
  return searches.filter((item) => item.query.toLowerCase() !== query.toLowerCase());
}

/**
 * Clear all recent searches
 */
export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch {
    // Silently ignore storage errors
  }
}

// ============================================================================
// Search Icon Component
// ============================================================================

function SearchIcon({ color }: { color: string }) {
  return (
    <ThemedText style={[styles.searchIcon, { color }]} testID="search-icon">
      🔍
    </ThemedText>
  );
}

// ============================================================================
// Clear Button Component
// ============================================================================

interface ClearButtonProps {
  onPress: () => void;
  color: string;
  testID?: string;
}

function ClearButton({ onPress, color, testID }: ClearButtonProps) {
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
      <TouchableOpacity
        testID={testID ?? 'menu-search-clear-button'}
        style={styles.clearButton}
        onPress={onPress}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ThemedText style={[styles.clearButtonText, { color }]}>✕</ThemedText>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// Recent Search Item Component
// ============================================================================

interface RecentSearchItemProps {
  item: RecentSearchItem;
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  colors: typeof Colors.light;
  testID?: string;
}

function RecentSearchItemRow({ item, onSelect, onRemove, colors, testID }: RecentSearchItemProps) {
  return (
    <TouchableOpacity
      testID={testID ?? `recent-search-${item.query}`}
      style={[styles.recentSearchItem, { borderBottomColor: colors.border }]}
      onPress={() => onSelect(item.query)}
      activeOpacity={0.7}
    >
      <ThemedText style={[styles.recentSearchIcon, { color: colors.textMuted }]}>🕐</ThemedText>
      <ThemedText style={[styles.recentSearchText, { color: colors.text }]} numberOfLines={1}>
        {item.query}
      </ThemedText>
      <TouchableOpacity
        testID={`remove-recent-search-${item.query}`}
        onPress={() => onRemove(item.query)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ThemedText style={[styles.recentSearchRemove, { color: colors.textMuted }]}>✕</ThemedText>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ============================================================================
// Recent Searches Dropdown Component
// ============================================================================

interface RecentSearchesDropdownProps {
  searches: RecentSearchItem[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClearAll: () => void;
  colors: typeof Colors.light;
  testID?: string;
}

function RecentSearchesDropdown({
  searches,
  onSelect,
  onRemove,
  onClearAll,
  colors,
  testID,
}: RecentSearchesDropdownProps) {
  if (searches.length === 0) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      testID={testID ?? 'recent-searches-dropdown'}
      style={[
        styles.recentSearchesDropdown,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.recentSearchesHeader, { borderBottomColor: colors.border }]}>
        <ThemedText style={[styles.recentSearchesTitle, { color: colors.textSecondary }]}>
          Recent Searches
        </ThemedText>
        <TouchableOpacity
          testID="clear-all-recent-searches"
          onPress={onClearAll}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.recentSearchesClear, { color: BrandColors.primary }]}>
            Clear All
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Search Items */}
      <ScrollView
        style={styles.recentSearchesList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {searches.map((item) => (
          <RecentSearchItemRow
            key={item.query}
            item={item}
            onSelect={onSelect}
            onRemove={onRemove}
            colors={colors}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

// ============================================================================
// Main MenuSearch Component
// ============================================================================

export function MenuSearch({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search menu...',
  showRecentSearches = true,
  maxRecentSearches = MAX_RECENT_SEARCHES,
  autoFocus = false,
  disabled = false,
  testID = 'menu-search',
  inputProps,
}: MenuSearchProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // State
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Refs
  const inputRef = useRef<TextInput>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated values
  const borderProgress = useSharedValue(0);

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Load recent searches on mount
  useEffect(() => {
    if (showRecentSearches) {
      loadRecentSearches().then((searches) => {
        setRecentSearches(searches.slice(0, maxRecentSearches));
      });
    }
  }, [showRecentSearches, maxRecentSearches]);

  // Animated border style
  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: borderProgress.value > 0 ? BrandColors.primary : colors.border,
  }));

  // Handle text change with debounce
  const handleChangeText = useCallback(
    (text: string) => {
      setLocalValue(text);
      setShowDropdown(false);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        onChangeText(text);
      }, DEBOUNCE_DELAY);
    },
    [onChangeText]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChangeText('');
    inputRef.current?.focus();
  }, [onChangeText]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    const trimmedValue = localValue.trim();
    if (trimmedValue && showRecentSearches) {
      // Add to recent searches
      const newSearches = addToRecentSearches(recentSearches, trimmedValue, maxRecentSearches);
      setRecentSearches(newSearches);
      saveRecentSearches(newSearches);
    }

    onSubmit?.(trimmedValue);
    Keyboard.dismiss();
    setShowDropdown(false);
  }, [localValue, onSubmit, recentSearches, showRecentSearches, maxRecentSearches]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    borderProgress.value = withTiming(1, { duration: 150 });

    // Show dropdown if there's no text and we have recent searches
    if (!localValue.trim() && recentSearches.length > 0 && showRecentSearches) {
      setShowDropdown(true);
    }
  }, [borderProgress, localValue, recentSearches, showRecentSearches]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    borderProgress.value = withTiming(0, { duration: 150 });

    // Delay hiding dropdown to allow clicking on items
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  }, [borderProgress]);

  // Handle recent search selection
  const handleSelectRecentSearch = useCallback(
    (query: string) => {
      setLocalValue(query);
      onChangeText(query);
      setShowDropdown(false);
      Keyboard.dismiss();
    },
    [onChangeText]
  );

  // Handle remove recent search
  const handleRemoveRecentSearch = useCallback(
    (query: string) => {
      const newSearches = removeFromRecentSearches(recentSearches, query);
      setRecentSearches(newSearches);
      saveRecentSearches(newSearches);
    },
    [recentSearches]
  );

  // Handle clear all recent searches
  const handleClearAllRecentSearches = useCallback(() => {
    setRecentSearches([]);
    clearRecentSearches();
    setShowDropdown(false);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const shouldShowDropdown =
    showDropdown && showRecentSearches && recentSearches.length > 0 && !localValue.trim();

  return (
    <View style={styles.container} testID={testID}>
      {/* Search Input Container */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
          animatedBorderStyle,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        {/* Search Icon */}
        <SearchIcon color={isFocused ? BrandColors.primary : colors.textMuted} />

        {/* Text Input */}
        <TextInput
          ref={inputRef}
          testID={`${testID}-input`}
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={localValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus={autoFocus}
          editable={!disabled}
          {...inputProps}
        />

        {/* Clear Button */}
        {localValue.length > 0 && !disabled && (
          <ClearButton
            onPress={handleClear}
            color={colors.textMuted}
            testID={`${testID}-clear-button`}
          />
        )}
      </Animated.View>

      {/* Recent Searches Dropdown */}
      {shouldShowDropdown && (
        <RecentSearchesDropdown
          searches={recentSearches}
          onSelect={handleSelectRecentSearch}
          onRemove={handleRemoveRecentSearch}
          onClearAll={handleClearAllRecentSearches}
          colors={colors}
          testID={`${testID}-recent-searches`}
        />
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  inputContainerDisabled: {
    opacity: 0.6,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.md,
  },
  clearButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentSearchesDropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  recentSearchesTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentSearchesClear: {
    fontSize: 12,
    fontWeight: '500',
  },
  recentSearchesList: {
    maxHeight: 220,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentSearchIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 14,
  },
  recentSearchRemove: {
    fontSize: 12,
    padding: Spacing.xs,
  },
});

export default MenuSearch;
