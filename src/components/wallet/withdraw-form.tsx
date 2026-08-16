import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, formatMoney, Icon, Input, SuccessModal } from '@/components/ui';
import { Radius, Spacing, Type } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useWalletSecurity } from '@/queries/use-wallet-security';
import { useRequestWithdrawal, useWallet } from '@/queries/use-wallet';
import { useTheme } from '@/hooks/use-theme';

export function WithdrawForm() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const shell = profile?.role === 'provider' ? 'provider' : 'user';

  const { data: wallet } = useWallet();
  const { data: security, isLoading: securityLoading } = useWalletSecurity();
  const withdraw = useRequestWithdrawal();

  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const balance = wallet?.balance ?? 0;
  const hasBank = Boolean(security?.hasBank);
  const hasPin = Boolean(security?.hasPin);
  const ready = hasBank && hasPin;

  // Evaluated by Postgres, which is also what enforces it — comparing against
  // device time here would be an impure render and would drift with clock skew.
  const locked = Boolean(security?.pinLocked);

  async function handleWithdraw() {
    setAmountError(null);
    setPinError(null);
    setSubmissionError(null);

    const value = Number(amount.replace(/[^0-9.]/g, ''));
    let invalid = false;

    if (!value) {
      setAmountError('Enter an amount');
      invalid = true;
    } else if (value > balance) {
      setAmountError('Amount exceeds your balance');
      invalid = true;
    }
    if (!/^\d{4}$/.test(pin)) {
      setPinError('Enter your 4-digit PIN');
      invalid = true;
    }
    if (invalid) return;

    try {
      // The PIN is checked inside request_withdrawal, in the same transaction
      // that debits the wallet — there is no client-side check to bypass.
      await withdraw.mutateAsync({ amount: value, pin });
      setPin('');
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not request withdrawal.';
      if (/pin/i.test(msg)) setPinError(msg);
      else setSubmissionError(msg);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Withdraw' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
          <Text style={[Type.body, { color: theme.textSecondary }]}>
            Available:{' '}
            <Text style={{ color: theme.text, fontWeight: '700' }}>{formatMoney(balance)}</Text>
          </Text>

          {/* ── Setup gate ─────────────────────────────────────────
              Both requirements are shown together rather than one at a
              time, so the user knows the full cost of getting started. */}
          {!securityLoading && !ready ? (
            <Card>
              <Text style={[Type.h3, { color: theme.text }]}>Before you can withdraw</Text>
              <Text style={[Type.callout, { color: theme.textSecondary, marginTop: Spacing.two }]}>
                These protect your money. You only set them up once.
              </Text>

              <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
                <SetupRow
                  done={hasBank}
                  icon="business"
                  title="Link a bank account"
                  hint="We verify it with your bank"
                  onPress={() => router.push(routes.walletBank(shell))}
                />
                <SetupRow
                  done={hasPin}
                  icon="lock-closed"
                  title="Set a transfer PIN"
                  hint="Asked for on every withdrawal"
                  onPress={() => router.push(routes.walletPin(shell))}
                />
              </View>
            </Card>
          ) : null}

          {ready ? (
            <>
              <Card>
                <View style={styles.destHead}>
                  <Icon name="business" size={16} color={theme.textSecondary} />
                  <Text style={[Type.caption, { color: theme.textSecondary }]}>
                    PAYING OUT TO
                  </Text>
                </View>
                <Text style={[Type.bodyMedium, { color: theme.text, marginTop: Spacing.one }]}>
                  {security?.accountName}
                </Text>
                <Text style={[Type.caption, { color: theme.textSecondary }]}>
                  {security?.bankName} · {security?.accountMasked}
                </Text>
                <Pressable onPress={() => router.push(routes.walletBank(shell))} hitSlop={6}>
                  <Text style={[Type.caption, { color: theme.tint, marginTop: Spacing.two }]}>
                    Change account
                  </Text>
                </Pressable>
              </Card>

              <Input
                label="Amount"
                value={amount}
                onChangeText={(val) => {
                  setAmount(val);
                  setAmountError(null);
                }}
                error={amountError}
                keyboardType="number-pad"
                placeholder="₦ 0"
                autoFocus
              />

              <Input
                label="Transfer PIN"
                value={pin}
                onChangeText={(val) => {
                  setPin(val.replace(/[^0-9]/g, '').slice(0, 4));
                  setPinError(null);
                }}
                error={pinError}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                placeholder="••••"
              />

              {locked ? (
                <Text style={[Type.callout, { color: theme.danger }]}>
                  Too many incorrect PIN attempts. Withdrawals are locked for a short
                  while — try again shortly.
                </Text>
              ) : null}

              <Text style={[Type.caption, { color: theme.textSecondary }]}>
                Withdrawals are sent to your linked bank account and usually settle within
                24 hours.
              </Text>

              {submissionError ? (
                <Text selectable style={[Type.callout, { color: theme.danger }]}>
                  {submissionError}
                </Text>
              ) : null}

              <Button
                title="Request withdrawal"
                size="lg"
                icon="arrow-up-circle"
                disabled={locked}
                loading={withdraw.isPending}
                onPress={handleWithdraw}
              />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={done}
        onClose={() => {
          setDone(false);
          router.back();
        }}
        title="Withdrawal requested"
        message={`Your payout to ${security?.accountName ?? 'your bank'} is being processed and usually settles within 24 hours.`}
        amount={Number(amount.replace(/[^0-9.]/g, '')) || undefined}
        icon="arrow-up-circle"
      />
    </View>
  );
}

function SetupRow({
  done,
  icon,
  title,
  hint,
  onPress,
}: {
  done: boolean;
  icon: 'business' | 'lock-closed';
  title: string;
  hint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={done ? undefined : onPress}
      style={[
        styles.setupRow,
        {
          backgroundColor: done ? theme.success + '14' : theme.backgroundElement,
          borderColor: done ? theme.success + '44' : 'transparent',
        },
      ]}>
      <Icon
        name={done ? 'checkmark-circle' : icon}
        size={20}
        color={done ? theme.success : theme.tint}
      />
      <View style={{ flex: 1 }}>
        <Text style={[Type.bodyMedium, { color: theme.text }]}>{title}</Text>
        <Text style={[Type.caption, { color: theme.textSecondary }]}>{hint}</Text>
      </View>
      {done ? null : <Icon name="chevron-forward" size={16} color={theme.textSecondary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.four },
  destHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  setupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
