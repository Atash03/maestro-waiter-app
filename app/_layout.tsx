import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { AnimatedSplashLogo } from '@/components/common/AnimatedSplashLogo';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import { useOfflineCacheSync, useOfflineInit } from '@/src/hooks/useOfflineSupport';
import { useAuthCallbacks, useProtectedRoute } from '@/src/hooks/useProtectedRoute';
import { initializeApiClient } from '@/src/services/api/client';
import { useAuthStore } from '@/src/stores/authStore';
import { useDiscoveryStore } from '@/src/stores/discoveryStore';
import { useNetworkStore } from '@/src/stores/networkStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const colorScheme = useEffectiveColorScheme();
  const { isInitializing, initialize: initializeAuth } = useAuthStore();
  const { initialize: initializeSettings } = useSettingsStore();
  const { initialize: initializeNetwork, cleanup: cleanupNetwork } = useNetworkStore();

  // Discovery state
  const isResolved = useDiscoveryStore((s) => s.isResolved);
  const serverUrl = useDiscoveryStore((s) => s.serverUrl);
  const initializeDiscovery = useDiscoveryStore((s) => s.initialize);
  const cleanupDiscovery = useDiscoveryStore((s) => s.cleanup);

  const [apiInitialized, setApiInitialized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const discoveryInitRef = useRef(false);

  // Phase 1: Start service discovery (also re-triggers after reset)
  useEffect(() => {
    if (discoveryInitRef.current && !isResolved) {
      // Discovery was reset — clear refs so it re-initializes
      discoveryInitRef.current = false;
      setApiInitialized(false);
      setIsReady(false);
      setSplashAnimationDone(false);
    }
    if (!discoveryInitRef.current && !isResolved) {
      discoveryInitRef.current = true;
      initializeDiscovery();
    }
  }, [isResolved, initializeDiscovery]);

  // Phase 2: Initialize API client once server is discovered
  useEffect(() => {
    if (isResolved && serverUrl && !apiInitialized) {
      initializeApiClient({ baseURL: serverUrl });
      setApiInitialized(true);
    }
  }, [isResolved, serverUrl, apiInitialized]);

  // Initialize offline support (loads cached data and starts sync monitoring)
  useOfflineInit();

  // Sync data to offline cache when it changes
  useOfflineCacheSync();

  // Phase 3: Initialize stores once API client is ready
  useEffect(() => {
    if (!apiInitialized) return;

    async function initApp() {
      initializeNetwork();
      await Promise.all([initializeAuth(), initializeSettings()]);
      setIsReady(true);
    }
    initApp();

    return () => {
      cleanupNetwork();
      cleanupDiscovery();
    };
  }, [apiInitialized, initializeAuth, initializeSettings, initializeNetwork, cleanupNetwork, cleanupDiscovery]);

  // Set up API client callbacks for auth errors (401/403)
  useAuthCallbacks();

  // Handle protected route navigation (disabled when discovery not resolved — no navigator mounted)
  const { isNavigationReady, isCheckingAuth } = useProtectedRoute(isResolved);

  const appReady = isResolved && isReady && !isInitializing && isNavigationReady && !isCheckingAuth;

  const handleSplashComplete = useCallback(() => {
    setSplashAnimationDone(true);
  }, []);

  // Safety timeout — never block the app permanently
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSplashAnimationDone(true);
    }, 10_000);
    return () => clearTimeout(timeout);
  }, []);

  // Show animated splash during all loading phases (discovery + init)
  if (!appReady || !splashAnimationDone) {
    return (
      <AnimatedSplashLogo
        onAnimationComplete={handleSplashComplete}
        startAnimation={appReady}
      />
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <ErrorBoundary>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(main)" options={{ headerShown: false }} />
          </Stack>
          <OfflineBanner />
          <OfflineIndicator />
          <Toaster position="top-center" />
          <StatusBar style="auto" />
        </ThemeProvider>
      </ErrorBoundary>
    </Animated.View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
