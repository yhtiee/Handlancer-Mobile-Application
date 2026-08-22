import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  formatMoney,
  GlobalLoader,
  Icon,
  type IconName,
  Screen,
} from '@/components/ui';
import { Radius, Spacing, Type } from '@/constants/theme';
import { formatDateTime } from '@/lib/date';
import { routes } from '@/lib/routes';
import { useWalletSecurity } from '@/queries/use-wallet-security';
import { useTransaction } from '@/queries/use-wallet';
import type { TxnStatus, TxnType } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

/**
 * Copy per transaction type. `credit` drives the sign and colour; `blurb`
 * answers the question the list row cannot - what this movement actually was.
 */
const META: Record<TxnType, { label: string; icon: IconName; credit: boolean; blurb: string }> = {
  fund: {
    label: 'Wallet top-up',
    icon: 'arrow-down-circle',
    credit: true,
    blurb: 'Money you added to your HandLancer wallet.',
  },
  withdraw: {
    label: 'Withdrawal',
    icon: 'arrow-up-circle',
    credit: false,
    blurb: 'A payout from your wallet to your linked bank account.',
  },
  escrow_hold: {
    label: 'Into escrow',
    icon: 'lock-closed',
    credit: false,
    blurb: 'Held safely for this job. It is only paid out when you approve the work.',
  },
  escrow_release: {
    label: 'Materials released',
    icon: 'cube',
    credit: true,
    blurb: 'The materials portion of the escrow, released to the provider.',
  },
  payout: {
    label: 'Job payout',
    icon: 'checkmark-circle',
    credit: true,
    blurb: 'The final payment for completed work.',
  },
};

const STATUS_TEXT: Record<TxnStatus, string> = {
  pending: 'Pending',
  success: 'Successful',
  failed: 'Failed',
};

export function TransactionDetailScreen({ shell }: { shell: 'user' | 'provider' }) {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: txn, isLoading } = useTransaction(id);
  const { data: security } = useWalletSecurity();
  const [copied, setCopied] = useState(false);

  if (isLoading || !txn) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Transaction' }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={[Type.body, { color: theme.textSecondary }]}>Transaction not found.</Text>
        )}
      </View>
    );
  }

  const meta = META[txn.type];
  const statusColor =
    txn.status === 'success'
      ? theme.success
      : txn.status === 'failed'
        ? theme.danger
        : theme.warning;

  async function copyReference() {
    await Clipboard.setStringAsync(txn?.reference ?? txn?.id ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Transaction' }} />
      <Screen contentContainerStyle={styles.content}>
        {/* Amount, sign and outcome, above everything else. */}
        <View style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: statusColor + '1F' }]}>
            <Icon name={meta.icon} size={30} color={statusColor} />
          </View>
          <Text
            selectable
            style={[
              Type.display,
              styles.amount,
              { color: meta.credit ? theme.success : theme.text },
            ]}>
            {meta.credit ? '+' : '-'}
            {formatMoney(txn.amount)}
          </Text>
          <Text style={[Type.h3, { color: theme.text }]}>{meta.label}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '1F' }]}>
            <Text style={[Type.micro, { color: statusColor }]}>
              {STATUS_TEXT[txn.status].toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[Type.callout, styles.blurb, { color: theme.textSecondary }]}>
          {meta.blurb}
        </Text>

        <Card padded={false}>
          <DetailRow label="Date" value={formatDateTime(txn.created_at)} />
          <Divider />
          <DetailRow label="Type" value={meta.label} />
          <Divider />
          <DetailRow label="Status" value={STATUS_TEXT[txn.status]} valueColor={statusColor} />
          {/* The bank is only meaningful for a payout leaving the wallet. */}
          {txn.type === 'withdraw' && security?.hasBank ? (
            <>
              <Divider />
              <DetailRow
                label="Paid to"
                value={`${security.bankName} - ${security.accountMasked}`}
              />
            </>
          ) : null}
        </Card>

        {/* What this money was actually for. */}
        {txn.job ? (
          <Card padded={false}>
            <Pressable
              onPress={() =>
                router.push(
                  shell === 'provider'
                    ? routes.providerJobDetail(txn.job!.id)
                    : routes.jobDetail(txn.job!.id),
                )
              }
              style={({ pressed }) => [
                styles.linkRow,
                { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
              ]}>
              <View style={[styles.smallIcon, { backgroundColor: theme.tint + '1F' }]}>
                <Icon name="briefcase" size={18} color={theme.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Type.caption, { color: theme.textSecondary }]}>JOB</Text>
                <Text numberOfLines={1} style={[Type.bodyMedium, { color: theme.text }]}>
                  {txn.job.title}
                </Text>
              </View>
              <Icon name="chevron-forward" size={16} color={theme.textSecondary} />
            </Pressable>

            {txn.counterparty ? (
              <>
                <Divider />
                <View style={styles.linkRow}>
                  <Avatar uri={txn.counterparty.avatar_url} name={txn.counterparty.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Type.caption, { color: theme.textSecondary }]}>
                      {shell === 'provider' ? 'CUSTOMER' : 'PROVIDER'}
                    </Text>
                    <Text numberOfLines={1} style={[Type.bodyMedium, { color: theme.text }]}>
                      {txn.counterparty.name ?? 'Unnamed'}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </Card>
        ) : null}

        {/* The bit support will ask for. */}
        <Card>
          <Text style={[Type.caption, { color: theme.textSecondary }]}>REFERENCE</Text>
          <Text selectable style={[Type.body, styles.reference, { color: theme.text }]}>
            {txn.reference ?? txn.id}
          </Text>
          <Button
            title={copied ? 'Copied' : 'Copy reference'}
            variant="secondary"
            icon={copied ? 'checkmark' : 'copy'}
            onPress={copyReference}
            style={{ marginTop: Spacing.three }}
          />
        </Card>

        <Button
          title="Contact support about this"
          variant="ghost"
          icon="help-circle"
          onPress={() => router.push(routes.profileSupport(shell))}
        />
      </Screen>
    </>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[Type.callout, { color: theme.textSecondary }]}>{label}</Text>
      <Text
        selectable
        style={[Type.bodyMedium, styles.detailValue, { color: valueColor ?? theme.text }]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { gap: Spacing.three, paddingTop: Spacing.four },
  hero: { alignItems: 'center', gap: Spacing.two },
  amount: { fontVariant: ['tabular-nums'] },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  statusPill: {
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  blurb: { textAlign: 'center', paddingHorizontal: Spacing.three },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
  },
  detailValue: { flexShrink: 1, textAlign: 'right' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    padding: Spacing.three,
  },
  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reference: { marginTop: 2, fontVariant: ['tabular-nums'] },
});
