/**
 * NetworkErrorBoundary - Specialized error boundary for network-related errors
 *
 * Features:
 * - Shows network-specific error UI
 * - Integrates with network store for offline detection
 * - Provides retry with automatic reconnection
 * - Shows different UI based on connection status
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { selectIsOffline, useNetworkStore } from '@/src/stores/networkStore';

interface NetworkErrorBoundaryProps {
  children: ReactNode;
  error?: Error | null;
  onRetry?: () => void | Promise<void>;
  isLoading?: boolean;
}

export function NetworkErrorBoundary({
  children,
  error,
  onRetry,
  isLoading = false,
}: NetworkErrorBoundaryProps) {
  const isOffline = useNetworkStore(selectIsOffline);

  // Show offline UI if disconnected
  if (isOffline) {
    return <OfflineView onRetry={onRetry} isLoading={isLoading} />;
  }

  // Show error UI if there's a network error
  if (error) {
    return <NetworkErrorView error={error} onRetry={onRetry} isLoading={isLoading} />;
  }

  return <>{children}</>;
}

interface OfflineViewProps {
  onRetry?: () => void | Promise<void>;
  isLoading?: boolean;
}

function OfflineView({ onRetry, isLoading }: OfflineViewProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={[styles.iconContainer, styles.offlineIcon]}>
        <Text style={styles.icon}>!</Text>
      </View>
      <Text style={styles.title}>No Internet Connection</Text>
      <Text style={styles.message}>Please check your network connection and try again.</Text>
      {onRetry && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.offlineButton,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={onRetry}
          disabled={isLoading}
          accessibilityLabel="Retry connection"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{isLoading ? 'Retrying...' : 'Retry'}</Text>
        </Pressable>
      )}
    </View>
  );
}

interface NetworkErrorViewProps {
  error: Error;
  onRetry?: () => void | Promise<void>;
  isLoading?: boolean;
}

function NetworkErrorView({ error, onRetry, isLoading }: NetworkErrorViewProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={[styles.iconContainer, styles.errorIcon]}>
        <Text style={styles.icon}>!</Text>
      </View>
      <Text style={styles.title}>Connection Error</Text>
      <Text style={styles.message}>
        {error.message || 'Unable to connect to the server. Please try again.'}
      </Text>
      {onRetry && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={onRetry}
          disabled={isLoading}
          accessibilityLabel="Try again"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{isLoading ? 'Retrying...' : 'Try Again'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  offlineIcon: {
    backgroundColor: '#FEF3C7',
  },
  errorIcon: {
    backgroundColor: '#FEE2E2',
  },
  icon: {
    fontSize: 32,
    fontWeight: '700',
    color: '#D97706',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    maxWidth: 300,
  },
  button: {
    backgroundColor: '#F94623',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  offlineButton: {
    backgroundColor: '#D97706',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
