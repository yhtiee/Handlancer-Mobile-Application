import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/date';
import { describeNotification } from '@/lib/notification-copy';
import type { Notification } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

export function NotificationRow({ notification }: { notification: Notification }) {
  const theme = useTheme();
  const { icon, title, body } = describeNotification(
    notification.type,
    notification.payload as Record<string, unknown>,
  );
  const unread = !notification.read;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: unread ? theme.tint + '14' : theme.backgroundElement },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.tint + '22' }]}>
        <Icon name={icon} size={20} color={theme.tint} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {body ? (
          <Text numberOfLines={2} style={[styles.text, { color: theme.textSecondary }]}>
            {body}
          </Text>
        ) : null}
        <Text style={[styles.time, { color: theme.textSecondary }]}>
          {timeAgo(notification.created_at)}
        </Text>
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: theme.tint }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 20, height: 20 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  text: { fontSize: 14, lineHeight: 19 },
  time: { fontSize: 12, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
