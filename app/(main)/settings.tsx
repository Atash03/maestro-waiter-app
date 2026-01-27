/**
 * Settings Screen
 *
 * App settings including:
 * - Notification preferences (sound, vibration)
 * - Theme selection (light/dark/system)
 * - Language selection (en/ru/tm)
 * - About/version info
 */

import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { BorderRadius, BrandColors, Colors, Spacing } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import {
  LANGUAGE_NAMES,
  type Language,
  THEME_NAMES,
  type ThemeMode,
  useLanguage,
  useNotificationPreferences,
  useNotificationStore,
  useSettingsActions,
  useSettingsInitialized,
  useTheme,
} from '@/src/stores';
import { useDiscoveryStore } from '@/src/stores/discoveryStore';

// ============================================================================
// Types
// ============================================================================

interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  testID?: string;
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  delay?: number;
}

// ============================================================================
// Constants
// ============================================================================

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const BUILD_NUMBER = String(
  Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '1'
);

// ============================================================================
// Sub-Components
// ============================================================================

function SettingsSection({ title, children, delay = 0 }: SettingsSectionProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Animated.View entering={FadeIn.duration(300).delay(delay)} style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </ThemedText>
      <Card style={styles.sectionCard} bordered elevated={false}>
        {children}
      </Card>
    </Animated.View>
  );
}

function SettingsRow({ label, value, onPress, rightElement, testID }: SettingsRowProps) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const content = (
    <View style={styles.row}>
      <ThemedText style={[styles.rowLabel, { color: colors.text }]}>{label}</ThemedText>
      {rightElement ?? (
        <View style={styles.rowRight}>
          {value && (
            <ThemedText style={[styles.rowValue, { color: colors.textSecondary }]}>
              {value}
            </ThemedText>
          )}
          {onPress && (
            <ThemedText style={[styles.rowArrow, { color: colors.textMuted }]}>›</ThemedText>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} testID={testID} style={styles.rowTouchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View testID={testID}>{content}</View>;
}

function SettingsDivider() {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function SelectionModal({
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  title: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[styles.modalContent, { backgroundColor: colors.background }]}
        >
          <ThemedText style={[styles.modalTitle, { color: colors.text }]}>{title}</ThemedText>
          {options.map((option, index) => (
            <View key={option.value}>
              {index > 0 && <SettingsDivider />}
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <ThemedText style={[styles.modalOptionLabel, { color: colors.text }]}>
                  {option.label}
                </ThemedText>
                {selected === option.value && (
                  <ThemedText style={[styles.checkmark, { color: BrandColors.primary }]}>
                    ✓
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </Animated.View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SettingsScreen() {
  const colorScheme = useEffectiveColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Settings state
  const theme = useTheme();
  const language = useLanguage();
  const isSettingsInitialized = useSettingsInitialized();
  const {
    initialize: initializeSettings,
    setTheme,
    setLanguage,
  } = useSettingsActions();

  // Notification preferences
  const notificationPrefs = useNotificationPreferences();
  const notificationStore = useNotificationStore();

  // Discovery state
  const resetDiscovery = useDiscoveryStore((s) => s.reset);

  // Modal state
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Initialize settings on mount
  useEffect(() => {
    if (!isSettingsInitialized) {
      initializeSettings();
    }
  }, [isSettingsInitialized, initializeSettings]);

  // Handlers
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleThemeChange = useCallback(
    async (newTheme: string) => {
      await setTheme(newTheme as ThemeMode);
    },
    [setTheme]
  );

  const handleLanguageChange = useCallback(
    async (newLanguage: string) => {
      await setLanguage(newLanguage as Language);
    },
    [setLanguage]
  );

  const handleSoundToggle = useCallback(
    async (value: boolean) => {
      await notificationStore.setSoundEnabled(value);
    },
    [notificationStore]
  );

  const handleVibrationToggle = useCallback(
    async (value: boolean) => {
      await notificationStore.setVibrationEnabled(value);
    },
    [notificationStore]
  );

  const handleRediscover = useCallback(() => {
    Alert.alert(
      'Re-discover Server',
      'This will disconnect from the current server and search for it again on the network.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-discover',
          style: 'destructive',
          onPress: () => resetDiscovery(),
        },
      ]
    );
  }, [resetDiscovery]);

  // Theme options
  const themeOptions = Object.entries(THEME_NAMES).map(([value, label]) => ({
    value,
    label,
  }));

  // Language options
  const languageOptions = Object.entries(LANGUAGE_NAMES).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} testID="back-button">
          <ThemedText style={[styles.backText, { color: BrandColors.primary }]}>‹ Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID="settings-scroll-view"
      >
        {/* Notifications Section */}
        <SettingsSection title="NOTIFICATIONS" delay={0}>
          <SettingsRow
            label="Sound"
            testID="sound-setting"
            rightElement={
              <Switch
                value={notificationPrefs.soundEnabled}
                onValueChange={handleSoundToggle}
                trackColor={{ false: colors.border, true: BrandColors.primaryLight }}
                thumbColor={Platform.OS === 'android' ? colors.background : undefined}
                testID="sound-switch"
              />
            }
          />
          <SettingsDivider />
          <SettingsRow
            label="Vibration"
            testID="vibration-setting"
            rightElement={
              <Switch
                value={notificationPrefs.vibrationEnabled}
                onValueChange={handleVibrationToggle}
                trackColor={{ false: colors.border, true: BrandColors.primaryLight }}
                thumbColor={Platform.OS === 'android' ? colors.background : undefined}
                testID="vibration-switch"
              />
            }
          />
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection title="APPEARANCE" delay={100}>
          <SettingsRow
            label="Theme"
            value={THEME_NAMES[theme]}
            onPress={() => setShowThemeModal(true)}
            testID="theme-setting"
          />
          <SettingsDivider />
          <SettingsRow
            label="Language"
            value={LANGUAGE_NAMES[language]}
            onPress={() => setShowLanguageModal(true)}
            testID="language-setting"
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="ABOUT" delay={200}>
          <SettingsRow label="Version" value={APP_VERSION} testID="version-info" />
          <SettingsDivider />
          <SettingsRow label="Build" value={BUILD_NUMBER} testID="build-info" />
        </SettingsSection>

        {/* Server Section */}
        <SettingsSection title="SERVER" delay={300}>
          <SettingsRow
            label="Re-discover Server"
            onPress={handleRediscover}
            testID="rediscover-server"
          />
        </SettingsSection>

        {/* Footer */}
        <Animated.View entering={FadeIn.duration(300).delay(400)} style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: colors.textMuted }]}>
            Maestro Waiter App
          </ThemedText>
          <ThemedText style={[styles.footerSubtext, { color: colors.textMuted }]}>
            © 2026 Maestro Restaurant Systems
          </ThemedText>
        </Animated.View>
      </ScrollView>

      {/* Theme Selection Modal */}
      {showThemeModal && (
        <SelectionModal
          title="Select Theme"
          options={themeOptions}
          selected={theme}
          onSelect={handleThemeChange}
          onClose={() => setShowThemeModal(false)}
        />
      )}

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <SelectionModal
          title="Select Language"
          options={languageOptions}
          selected={language}
          onSelect={handleLanguageChange}
          onClose={() => setShowLanguageModal(false)}
        />
      )}
    </ThemedView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  backText: {
    fontSize: 17,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  sectionCard: {
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  rowTouchable: {
    // Touchable wrapper
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowValue: {
    fontSize: 16,
  },
  rowArrow: {
    fontSize: 22,
    fontWeight: '300',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.lg,
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  // Modal styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.7,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  modalOptionLabel: {
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '600',
  },
});
