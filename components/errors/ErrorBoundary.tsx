/**
 * ErrorBoundary - React Error Boundary for catching render errors
 *
 * Features:
 * - Catches JavaScript errors in child component tree
 * - Displays user-friendly fallback UI
 * - Provides retry functionality
 * - Logs errors for debugging
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createRenderError, type DisplayError } from '@/src/services/errorHandler';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: DisplayError, retry: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  displayError: DisplayError | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      displayError: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      displayError: createRenderError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging (console is acceptable in error boundaries)
    // biome-ignore lint/suspicious/noConsole: Error boundaries need console for debugging
    console.error('ErrorBoundary caught an error:', error);
    // biome-ignore lint/suspicious/noConsole: Error boundaries need console for debugging
    console.error('Component stack:', errorInfo.componentStack);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      displayError: null,
    });
  };

  render(): ReactNode {
    const { hasError, displayError } = this.state;
    const { children, fallback } = this.props;

    if (hasError && displayError) {
      // Custom fallback provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(displayError, this.handleRetry);
        }
        return fallback;
      }

      // Default fallback UI
      return <DefaultErrorFallback error={displayError} onRetry={this.handleRetry} />;
    }

    return children;
  }
}

interface DefaultErrorFallbackProps {
  error: DisplayError;
  onRetry: () => void;
}

function DefaultErrorFallback({ error, onRetry }: DefaultErrorFallbackProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>!</Text>
      </View>
      <Text style={styles.title}>{error.title}</Text>
      <Text style={styles.message}>{error.message}</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onRetry}
        accessibilityLabel="Try again"
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Try Again</Text>
      </Pressable>
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
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
    fontWeight: '700',
    color: '#EF4444',
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
  },
  buttonPressed: {
    backgroundColor: '#D63D1E',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
