import Animated, { FadeIn } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
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
      <View style={styles.iconStack}>
        <View style={[styles.halo, { backgroundColor: theme.tint + '10' }]} />
        <View style={[styles.iconWrap, { backgroundColor: theme.tint + '1A' }]}>
          <Icon name={icon} size={34} color={theme.tint} />
        </View>
      </View>
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
  iconStack: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  halo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 52 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 280 },
  action: { marginTop: Spacing.three },
});
