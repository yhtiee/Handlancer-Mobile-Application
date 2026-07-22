import { StyleSheet, Text, View } from 'react-native';

import { formatMoney, Icon, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/date';
import type { Transaction, TxnType } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

const META: Record<TxnType, { label: string; icon: IconName; credit: boolean }> = {
  fund: { label: 'Wallet top-up', icon: 'arrow-down-circle', credit: true },
  withdraw: { label: 'Withdrawal', icon: 'arrow-up-circle', credit: false },
  escrow_hold: { label: 'Into escrow', icon: 'lock-closed', credit: false },
  escrow_release: { label: 'Materials released', icon: 'cube', credit: true },
  payout: { label: 'Job payout', icon: 'checkmark-circle', credit: true },
};

export function TransactionRow({ txn }: { txn: Transaction }) {
  const theme = useTheme();
  const m = META[txn.type];
  const credit = m.credit;
  const color = credit ? theme.success : theme.text;
  const tint =
    txn.status === 'pending' ? theme.warning : credit ? theme.success : theme.textSecondary;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: tint + '22' }]}>
        <Icon name={m.icon} size={20} color={tint} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.text }]}>{m.label}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {txn.status === 'pending' ? 'Pending · ' : ''}
          {timeAgo(txn.created_at)}
        </Text>
      </View>
      <Text selectable style={[styles.amount, { color }]}>
        {credit ? '+' : '−'}
        {formatMoney(txn.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
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
  label: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 13 },
  amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
