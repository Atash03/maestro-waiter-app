import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-color-scheme';
import type { Translation } from '@/src/types/models';
import { getTranslatedText } from '@/src/utils/translations';

export interface LocationInfoProps {
  zoneTitle?: Translation | null;
  tableTitle?: string | null;
  testID?: string;
}

export function LocationInfo({ zoneTitle, tableTitle, testID }: LocationInfoProps) {
  const colorScheme = useEffectiveColorScheme();
  const isDark = colorScheme === 'dark';

  const zoneName = zoneTitle ? getTranslatedText(zoneTitle, '') : '';
  const tableName = tableTitle ?? '';

  const parts: string[] = [];
  if (zoneName) parts.push(zoneName);
  if (tableName) parts.push(tableName);

  if (parts.length === 0) return null;

  const bgColor = isDark ? Colors.dark.backgroundSecondary : '#f0f0f0';
  const textColor = isDark ? Colors.dark.textSecondary : '#646464';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]} testID={testID}>
      <ThemedText style={[styles.text, { color: textColor }]}>
        {parts.join(' / ')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});
