/**
 * Lazy Loading Utilities
 *
 * Provides utilities for lazy loading components to reduce initial bundle size.
 * Uses React.lazy with Suspense for code splitting.
 */

import type React from 'react';
import { lazy, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';

/**
 * Default fallback component shown while lazy components are loading
 */
export function LazyLoadFallback() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.light.tint} />
    </View>
  );
}

/**
 * Creates a lazy-loaded component with a loading fallback
 *
 * @param importFn - Dynamic import function for the component
 * @param fallback - Optional custom fallback component
 * @returns Wrapped lazy component with Suspense
 *
 * @example
 * const LazySettings = createLazyComponent(() => import('./Settings'));
 */
export function createLazyComponent<P extends Record<string, unknown>>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  fallback: React.ReactNode = <LazyLoadFallback />
) {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: P) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Preloads a lazy component in the background
 * Useful for preloading components that will likely be needed soon
 *
 * @param importFn - Dynamic import function for the component
 *
 * @example
 * // Preload settings when user hovers over settings button
 * preloadComponent(() => import('./Settings'));
 */
export function preloadComponent(importFn: () => Promise<unknown>) {
  importFn();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
