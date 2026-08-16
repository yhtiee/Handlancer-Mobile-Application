import { StyleSheet, Text, View } from 'react-native';

import { formatMoney, Icon, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/date';
import type { Notification } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

function describe(n: Notification): { icon: IconName; title: string; body: string } {
  const p = n.payload as Record<string, unknown>;
  switch (n.type) {
    case 'quote_received':
      return { icon: 'document-text', title: 'New quote', body: `On “${String(p.title ?? 'your job')}”` };
    case 'hired':
      return { icon: 'checkmark-circle', title: 'You were hired', body: String(p.title ?? 'A job') };
    case 'message':
      return { icon: 'chatbubble', title: 'New message', body: String(p.preview ?? '') };
    case 'review':
      return { icon: 'star', title: 'New review', body: `${String(p.rating ?? '')}★ on a completed job` };
    case 'materials_requested':
      return {
        icon: 'cube',
        title: 'Materials funds requested',
        body: `${formatMoney(Number(p.amount ?? 0))} on “${String(p.title ?? 'your job')}”`,
      };
    case 'completion_requested':
      return {
        icon: 'checkmark-circle',
        title: 'Work marked complete',
        body: `Review “${String(p.title ?? 'your job')}” to release the final payment`,
      };
    case 'dispute_resolved':
      return {
        icon: 'shield-checkmark',
        title: 'Dispute resolved',
        body: `${formatMoney(Number(p.released ?? 0))} released · ${formatMoney(Number(p.refunded ?? 0))} refunded`,
      };
    case 'escrow_release':
      return { icon: 'cube', title: 'Materials released', body: formatMoney(Number(p.amount ?? 0)) };
    case 'payout':
      return { icon: 'card', title: 'Payment received', body: formatMoney(Number(p.amount ?? 0)) };
    default:
      return { icon: 'notifications', title: 'Notification', body: '' };
  }
}

export function NotificationRow({ notification }: { notification: Notification }) {
  const theme = useTheme();
  const { icon, title, body } = describe(notification);
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
