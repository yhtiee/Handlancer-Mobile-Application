import { Stack, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input, formatMoney } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useInitTopUp, useRefreshWallet } from '@/queries/use-wallet';
import { useTheme } from '@/hooks/use-theme';

const PRESETS = [5000, 10000, 25000, 50000];

export function FundForm() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topUp = useInitTopUp();
  const refreshWallet = useRefreshWallet();

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleFund() {
    setError(null);
    const value = Number(amount.replace(/[^0-9.]/g, ''));
    if (!value || value < 100) return setError('Enter an amount of at least ₦100');
    try {
      const { link } = await topUp.mutateAsync(value);
      await WebBrowser.openBrowserAsync(link);
      // The webhook credits the wallet server-side while the browser is open, so
      // the cached balance is stale by the time this resolves. Refetch before
      // navigating back, otherwise a successful top-up looks like it did nothing.
      refreshWallet();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start payment.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Add Money' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Top up securely with Flutterwave — card, bank transfer or USSD.
        </Text>

        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable
              key={p}
              onPress={() => {
                setAmount(String(p));
                setError(null);
              }}
              style={[styles.preset, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.presetText, { color: theme.text }]}>{formatMoney(p)}</Text>
            </Pressable>
          ))}
        </View>

        <Input
          label="Amount"
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            setError(null);
          }}
          error={error}
          keyboardType="number-pad"
          placeholder="₦ 0"
          autoFocus
        />

        <Button
          title="Continue to payment"
          size="lg"
          icon="card"
          loading={topUp.isPending}
          onPress={handleFund}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.four },
  hint: { fontSize: 14, lineHeight: 20 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  preset: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  presetText: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
