import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { formatMoney, Icon, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import type { Transaction, TxnType } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

const META: Record<TxnType, { label: string; icon: IconName; credit: boolean }> = {
  fund: { label: 'Wallet funded', icon: 'arrow-down', credit: true },
  withdraw: { label: 'Withdrawal', icon: 'arrow-up', credit: false },
  escrow_hold: { label: 'Into escrow', icon: 'lock-closed-outline', credit: false },
  escrow_release: { label: 'Materials released', icon: 'cube-outline', credit: true },
  payout: { label: 'Job payout', icon: 'checkmark', credit: true },
};

export function TransactionRow({
  txn,
  shell,
}: {
  txn: Transaction;
  shell: 'user' | 'provider';
}) {
  const theme = useTheme();
  const router = useRouter();
  const m = META[txn.type];
  const credit = m.credit;

  return (
    <Pressable
      onPress={() => router.push(routes.walletTransaction(shell, txn.id))}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      {/* Neutral glyph on a raised disc: direction is told by the sign and
          the arrow, not by colour, which fails contrast at this size. */}
      <View style={[styles.iconWrap, { backgroundColor: theme.backgroundElement }]}>
        <Icon name={m.icon} size={17} color={theme.text} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.text }]}>{m.label}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {txn.status === 'pending' ? 'Pending · ' : ''}
          {timeAgo(txn.created_at)}
        </Text>
      </View>
      {/* Amount and affordance share the trailing edge: the chevron is what
          tells the user the receipt behind this row exists at all. */}
      <Text selectable={false} style={[styles.amount, { color: theme.text }]}>
        {credit ? '+' : '−'}
        {formatMoney(txn.amount)}
      </Text>
      <Icon name="chevron-forward" size={15} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    paddingVertical: Spacing.twoHalf,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 20, height: 20 },
  body: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 13 },
  amount: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
