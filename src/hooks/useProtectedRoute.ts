/**
 * Protected Route Hook for the Maestro Waiter App
 *
 * This hook handles authentication-based navigation:
 * - Redirects unauthenticated users to the login screen
 * - Redirects authenticated users away from auth screens
 * - Provides loading state while checking authentication
 */

import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

/**
 * Route segment groups
 */
const AUTH_GROUP = '(auth)';
const MAIN_GROUPS = ['(tabs)', '(main)'];

/**
 * Check if a segment is in the auth group
 */
function isInAuthGroup(segments: string[]): boolean {
  return segments[0] === AUTH_GROUP;
}

/**
 * Check if a segment is in a protected/main group
 */
function isInMainGroup(segments: string[]): boolean {
  return MAIN_GROUPS.includes(segments[0]);
}

export interface ProtectedRouteState {
  isNavigationReady: boolean;
  isCheckingAuth: boolean;
}

/**
 * Hook to manage protected route navigation
 *
 * @returns ProtectedRouteState with navigation and auth checking states
 *
 * @example
 * ```tsx
 * function RootLayoutNav() {
 *   const { isNavigationReady, isCheckingAuth } = useProtectedRoute();
 *
 *   if (!isNavigationReady || isCheckingAuth) {
 *     return <LoadingScreen />;
 *   }
 *
 *   return <Stack>...</Stack>;
 * }
 * ```
 */
export function useProtectedRoute(): ProtectedRouteState {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  const { isAuthenticated, isInitializing } = useAuthStore();
  const [hasNavigated, setHasNavigated] = useState(false);

  // Check if navigation is ready
  const isNavigationReady = navigationState?.key != null;

  useEffect(() => {
    // Don't do anything if navigation isn't ready or still initializing auth
    if (!isNavigationReady || isInitializing) {
      return;
    }

    const inAuthGroup = isInAuthGroup(segments);

    if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated and trying to access protected route
      // Redirect to login screen
      router.replace('/(auth)/login');
      setHasNavigated(true);
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated but on auth screen
      // Redirect to main app
      router.replace('/(tabs)/tables');
      setHasNavigated(true);
    } else if (!hasNavigated) {
      // First navigation complete
      setHasNavigated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isInitializing, isNavigationReady, segments, hasNavigated]);

  return {
    isNavigationReady,
    isCheckingAuth: isInitializing || (!hasNavigated && isNavigationReady),
  };
}

/**
 * Hook to check if user is authenticated
 * Simplified version for components that just need to know auth state
 */
export function useIsRouteProtected(): boolean {
  const segments = useSegments();
  return isInMainGroup(segments);
}

/**
 * Hook to handle API unauthorized responses
 * This should be used at the app root level to handle 401 responses globally
 */
export function useAuthCallbacks(): void {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    // Import the API client and set callbacks
    // This is done in useEffect to avoid circular dependencies
    import('../services/api/client').then(({ getApiClient, isApiClientInitialized }) => {
      if (!isApiClientInitialized()) {
        return;
      }

      const client = getApiClient();

      // Set callback for unauthorized responses (401)
      client.onUnauthorized = async () => {
        // Clear local session state
        await logout();
        // Navigate to login
        router.replace('/(auth)/login');
      };

      // Set callback for forbidden responses (403)
      client.onForbidden = (message: string) => {
        // biome-ignore lint/suspicious/noConsole: Legitimate logging for debugging forbidden responses
        console.warn('Access forbidden:', message);
        // The UI should handle displaying this error to the user
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logout]);
}

export default useProtectedRoute;
