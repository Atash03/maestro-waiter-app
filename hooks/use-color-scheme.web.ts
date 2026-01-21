import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useTheme } from '@/src/stores/settingsStore';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}

/**
 * Returns the effective color scheme based on user preference (web version).
 * - 'light' or 'dark' → returns that value directly
 * - 'system' → returns device system preference (with hydration support)
 */
export function useEffectiveColorScheme(): 'light' | 'dark' {
  const userTheme = useTheme();
  const systemColorScheme = useColorScheme();

  if (userTheme === 'system') {
    return systemColorScheme ?? 'light';
  }
  return userTheme;
}
