import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SectionHeader({
  title,
  actionLabel = 'View all',
  onPress,
}: {
  title: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[Type.h3, { color: theme.text }]}>{title}</Text>
      {onPress ? (
        <Pressable hitSlop={8} onPress={onPress} style={styles.action}>
          <Text style={[styles.actionText, { color: theme.tint }]}>{actionLabel}</Text>
          <Icon name="chevron-forward" size={14} color={theme.tint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontSize: 14, fontWeight: '600' },
});
