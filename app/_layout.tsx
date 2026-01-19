import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthCallbacks, useProtectedRoute } from '@/src/hooks/useProtectedRoute';
import { initializeApiClient } from '@/src/services/api/client';
import { useAuthStore } from '@/src/stores/authStore';
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

// Initialize API client
initializeApiClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
});

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isInitializing, initialize: initializeAuth } = useAuthStore();
  const { initialize: initializeSettings } = useSettingsStore();
  const [isReady, setIsReady] = useState(false);

  // Initialize stores on app start
  useEffect(() => {
    async function initApp() {
      // Initialize settings and auth in parallel
      await Promise.all([initializeAuth(), initializeSettings()]);
      setIsReady(true);
      await SplashScreen.hideAsync();
    }
    initApp();
  }, [initializeAuth, initializeSettings]);

  // Set up API client callbacks for auth errors (401/403)
  useAuthCallbacks();

  // Handle protected route navigation
  const { isNavigationReady, isCheckingAuth } = useProtectedRoute();

  // Show loading screen while initializing
  if (!isReady || isInitializing || !isNavigationReady || isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F94623" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
