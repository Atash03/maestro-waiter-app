import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useTheme } from '@/src/stores/settingsStore';

// Re-export system hook for cases where only system preference is needed
export { useColorScheme } from 'react-native';

/**
 * Returns the effective color scheme based on user preference.
 * - 'light' or 'dark' → returns that value directly
 * - 'system' → returns device system preference
 */
export function useEffectiveColorScheme(): 'light' | 'dark' {
  const userTheme = useTheme();
  const systemColorScheme = useSystemColorScheme();

  if (userTheme === 'system') {
    return systemColorScheme ?? 'light';
  }
  return userTheme;
}
