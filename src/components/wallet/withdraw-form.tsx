import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input, formatMoney } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useRequestWithdrawal, useWallet } from '@/queries/use-wallet';
import { hasPin, verifyPin } from '@/services/security';
import { useTheme } from '@/hooks/use-theme';

export function WithdrawForm() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: wallet } = useWallet();
  const withdraw = useRequestWithdrawal();

  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [pinRequired, setPinRequired] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const balance = wallet?.balance ?? 0;

  useEffect(() => {
    hasPin().then(setPinRequired);
  }, []);

  async function handleWithdraw() {
    setAmountError(null);
    setPinError(null);
    setSubmissionError(null);

    const value = Number(amount.replace(/[^0-9.]/g, ''));
    let hasError = false;

    if (!value) {
      setAmountError('Enter an amount');
      hasError = true;
    } else if (value > balance) {
      setAmountError('Amount exceeds your balance');
      hasError = true;
    }

    if (pinRequired) {
      if (!pin) {
        setPinError('Enter your PIN');
        hasError = true;
      } else if (!(await verifyPin(pin))) {
        setPinError('Incorrect PIN');
        hasError = true;
      }
    }

    if (hasError) return;

    try {
      await withdraw.mutateAsync(value);
      router.back();
    } catch (e) {
      setSubmissionError(e instanceof Error ? e.message : 'Could not request withdrawal.');
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
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
          <Text style={[styles.balance, { color: theme.textSecondary }]}>
            Available: <Text style={{ color: theme.text, fontWeight: '700' }}>{formatMoney(balance)}</Text>
          </Text>

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

          {pinRequired ? (
            <Input
              label="Withdrawal PIN"
              value={pin}
              onChangeText={(val) => {
                setPin(val);
                setPinError(null);
              }}
              error={pinError}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
            />
          ) : null}

          <Text style={[styles.note, { color: theme.textSecondary }]}>
            Withdrawals are sent to your linked bank account and usually settle within 24 hours.
          </Text>

          {submissionError ? (
            <Text selectable style={{ color: theme.danger, fontSize: 14, marginBottom: Spacing.two }}>
              {submissionError}
            </Text>
          ) : null}

          <Button
            title="Request withdrawal"
            size="lg"
            icon="arrow-up-circle"
            loading={withdraw.isPending}
            onPress={handleWithdraw}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.four },
  balance: { fontSize: 16 },
  note: { fontSize: 13, lineHeight: 19 },
});
