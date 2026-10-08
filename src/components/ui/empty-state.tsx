import Animated, { FadeIn } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Icon, type IconName } from '@/components/ui/icon';
import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <Icon name={icon} size={28} color={theme.textSecondary} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: theme.textSecondary }]}>{description}</Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  title: { ...Type.serifTitle, textAlign: 'center', marginTop: Spacing.two },
  desc: { fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 280 },
  action: { marginTop: Spacing.three },
});
