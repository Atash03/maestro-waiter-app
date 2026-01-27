/**
 * DiscoveryScreen - Full-screen branded UI shown during backend server discovery.
 *
 * States:
 * - Scanning: Radar pulse animation + "Searching for Maestro server..."
 * - Connecting: Pulsing dot + "Connecting to server..."
 * - Resolved: Green checkmark + "Server found!"
 * - Failed: Error message + Retry / Manual Entry buttons
 * - Manual Entry: URL input + Connect button
 */

import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BrandColors, BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useDiscoveryStore } from '@/src/stores/discoveryStore';
import type { DiscoveryStatus } from '@/src/stores/discoveryStore';

// ============================================================================
// Radar Pulse Animation Component
// ============================================================================

function RadarPulse() {
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.3);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.3);
  const ring3Scale = useSharedValue(1);
  const ring3Opacity = useSharedValue(0.3);

  useEffect(() => {
    const duration = 2000;

    // Ring 1 - immediate
    ring1Scale.value = withRepeat(withTiming(2.5, { duration }), -1, false);
    ring1Opacity.value = withRepeat(withTiming(0, { duration }), -1, false);

    // Ring 2 - delayed 500ms
    ring2Scale.value = withDelay(
      500,
      withRepeat(withTiming(2.5, { duration }), -1, false)
    );
    ring2Opacity.value = withDelay(
      500,
      withRepeat(withTiming(0, { duration }), -1, false)
    );

    // Ring 3 - delayed 1000ms
    ring3Scale.value = withDelay(
      1000,
      withRepeat(withTiming(2.5, { duration }), -1, false)
    );
    ring3Opacity.value = withDelay(
      1000,
      withRepeat(withTiming(0, { duration }), -1, false)
    );
  }, [ring1Scale, ring1Opacity, ring2Scale, ring2Opacity, ring3Scale, ring3Opacity]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));

  return (
    <View style={indicatorStyles.radarContainer}>
      <Animated.View style={[indicatorStyles.radarRing, ring1Style]} />
      <Animated.View style={[indicatorStyles.radarRing, ring2Style]} />
      <Animated.View style={[indicatorStyles.radarRing, ring3Style]} />
      {/* Center dot */}
      <View style={indicatorStyles.radarCenter}>
        <Text style={indicatorStyles.radarIcon}>W</Text>
      </View>
    </View>
  );
}

// ============================================================================
// Pulsing Dot (for connecting state)
// ============================================================================

function PulsingDot() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={indicatorStyles.radarContainer}>
      <Animated.View style={[indicatorStyles.pulsingDot, animatedStyle]} />
    </View>
  );
}

// ============================================================================
// Success Checkmark
// ============================================================================

function SuccessCheck() {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={indicatorStyles.radarContainer}>
      <Animated.View style={[indicatorStyles.successCircle, animatedStyle]}>
        <Text style={indicatorStyles.successIcon}>✓</Text>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Error Icon
// ============================================================================

function ErrorIcon() {
  return (
    <View style={indicatorStyles.radarContainer}>
      <Animated.View entering={FadeIn.duration(300)} style={indicatorStyles.errorCircle}>
        <Text style={indicatorStyles.errorIcon}>!</Text>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Status Indicator (selects the right animation based on status)
// ============================================================================

function StatusIndicator({ status }: { status: DiscoveryStatus }) {
  switch (status) {
    case 'scanning':
      return <RadarPulse />;
    case 'checking_cache':
    case 'connecting':
      return <PulsingDot />;
    case 'resolved':
      return <SuccessCheck />;
    case 'failed':
    case 'manual_entry':
      return <ErrorIcon />;
    default:
      return <PulsingDot />;
  }
}

// ============================================================================
// Status Text
// ============================================================================

function getStatusText(status: DiscoveryStatus, error: string | null): string {
  switch (status) {
    case 'checking_cache':
    case 'connecting':
      return 'Connecting to server...';
    case 'scanning':
      return 'Searching for Maestro server...';
    case 'resolved':
      return 'Server found!';
    case 'failed':
      return error || 'Discovery failed.';
    case 'manual_entry':
      return 'Enter server address';
    default:
      return 'Initializing...';
  }
}

// ============================================================================
// Manual Entry Form
// ============================================================================

function ManualEntryForm({ isDark }: { isDark: boolean }) {
  const [url, setUrl] = useState('');
  const { setManualUrl, retry, error } = useDiscoveryStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const colors = isDark ? Colors.dark : Colors.light;

  const handleConnect = async () => {
    if (!url.trim()) return;
    Keyboard.dismiss();
    setIsConnecting(true);
    await setManualUrl(url.trim());
    setIsConnecting(false);
  };

  const handleBackToScanning = () => {
    retry();
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={actionStyles.container}>
      {error && (
        <View style={[actionStyles.errorBanner, { backgroundColor: isDark ? Colors.dark.errorBackground : Colors.light.errorBackground }]}>
          <Text style={[actionStyles.errorBannerText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <View style={actionStyles.inputContainer}>
        <Text style={[actionStyles.inputLabel, { color: colors.textSecondary }]}>Server Address</Text>
        <TextInput
          style={[
            actionStyles.input,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="e.g., 192.168.1.100:3000"
          placeholderTextColor={colors.textMuted}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleConnect}
          editable={!isConnecting}
        />
      </View>

      <Pressable
        style={[actionStyles.primaryButton, isConnecting && actionStyles.primaryButtonDisabled]}
        onPress={handleConnect}
        disabled={isConnecting || !url.trim()}
      >
        <Text style={actionStyles.primaryButtonText}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Text>
      </Pressable>

      <Pressable
        style={[actionStyles.ghostButton, { borderColor: colors.border }]}
        onPress={handleBackToScanning}
        disabled={isConnecting}
      >
        <Text style={[actionStyles.ghostButtonText, { color: colors.textSecondary }]}>
          Back to Scanning
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// Failed Actions (Retry + Manual Entry buttons)
// ============================================================================

function FailedActions({ isDark }: { isDark: boolean }) {
  const { retry, showManualEntry, error } = useDiscoveryStore();
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={actionStyles.container}>
      {error && (
        <View style={[actionStyles.errorBanner, { backgroundColor: isDark ? Colors.dark.errorBackground : Colors.light.errorBackground }]}>
          <Text style={[actionStyles.errorBannerText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <Pressable style={actionStyles.primaryButton} onPress={retry}>
        <Text style={actionStyles.primaryButtonText}>Try Again</Text>
      </Pressable>

      <Pressable
        style={[actionStyles.ghostButton, { borderColor: colors.border }]}
        onPress={showManualEntry}
      >
        <Text style={[actionStyles.ghostButtonText, { color: colors.textSecondary }]}>
          Enter Manually
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// Main DiscoveryScreen Component
// ============================================================================

export function DiscoveryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const status = useDiscoveryStore((s) => s.status);
  const error = useDiscoveryStore((s) => s.error);

  // Hide native splash screen when this component mounts
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const statusText = getStatusText(status, error);
  const showActions = status === 'failed' || status === 'manual_entry';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.logoSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>M</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Maestro</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Waiter App</Text>
        </Animated.View>

        {/* Status Indicator */}
        <View style={styles.indicatorSection}>
          <StatusIndicator status={status} />
        </View>

        {/* Status Text */}
        {!showActions && (
          <Animated.Text
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[
              styles.statusText,
              { color: status === 'resolved' ? Colors.light.success : colors.textSecondary },
            ]}
          >
            {statusText}
          </Animated.Text>
        )}
      </View>

      {/* Action Area */}
      {status === 'failed' && <FailedActions isDark={isDark} />}
      {status === 'manual_entry' && <ManualEntryForm isDark={isDark} />}
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: BrandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoLetter: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
  },
  indicatorSection: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
});

const indicatorStyles = StyleSheet.create({
  radarContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: BrandColors.primary,
  },
  radarCenter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BrandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pulsingDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BrandColors.primary,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

const actionStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
  },
  errorBanner: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorBannerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: Spacing.md,
  },
  primaryButtonDisabled: {
    backgroundColor: '#FB9A89',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ghostButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ghostButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
