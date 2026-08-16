import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, GlobalLoader, Icon, SearchField, SuccessModal } from '@/components/ui';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useBanks, useSaveBankAccount, useWalletSecurity } from '@/queries/use-wallet-security';
import { resolveBankAccount } from '@/services/security';
import { useTheme } from '@/hooks/use-theme';

/**
 * Connect a payout bank account.
 *
 * The account holder's name is never typed — it comes back from the bank via
 * Flutterwave, and the user confirms it. That is the whole point of the step: it
 * stops a payout being queued to a mistyped or someone else's account.
 */
export function BankAccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: security } = useWalletSecurity();
  const { data: banks, isLoading: banksLoading, error: banksError } = useBanks();
  const save = useSaveBankAccount();

  const [bankQuery, setBankQuery] = useState('');
  const [bankCode, setBankCode] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedBank = banks?.find((b) => b.code === bankCode) ?? null;

  const filtered = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    const list = banks ?? [];
    return q ? list.filter((b) => b.name.toLowerCase().includes(q)) : list;
  }, [banks, bankQuery]);

  const canResolve = Boolean(bankCode) && /^\d{10}$/.test(accountNumber);

  async function verify() {
    setError(null);
    setResolvedName(null);
    if (!canResolve || !bankCode) return;
    setResolving(true);
    try {
      const res = await resolveBankAccount(accountNumber, bankCode);
      setResolvedName(res.accountName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify that account.');
    } finally {
      setResolving(false);
    }
  }

  async function confirm() {
    setError(null);
    if (!bankCode) return;
    try {
      await save.mutateAsync({ accountNumber, bankCode });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that account.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Bank Account' }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        {security?.hasBank ? (
          <Card>
            <View style={styles.currentHead}>
              <Icon name="checkmark-circle" size={18} color={theme.success} />
              <Text style={[Type.bodyMedium, { color: theme.text }]}>Current payout account</Text>
            </View>
            <Text style={[Type.body, { color: theme.textSecondary, marginTop: Spacing.two }]}>
              {security.accountName}
            </Text>
            <Text style={[Type.caption, { color: theme.textSecondary }]}>
              {security.bankName} · {security.accountMasked}
            </Text>
            <Text style={[Type.caption, { color: theme.textSecondary, marginTop: Spacing.two }]}>
              Adding a new account replaces this one.
            </Text>
          </Card>
        ) : null}

        {/* ── Bank ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[Type.h3, { color: theme.text }]}>Choose your bank</Text>

          {banksError ? (
            <Text selectable style={[Type.callout, { color: theme.danger }]}>
              Could not load the bank list. Check your connection and try again.
            </Text>
          ) : null}

          {selectedBank ? (
            <Pressable
              onPress={() => {
                setBankCode(null);
                setResolvedName(null);
              }}
              style={[styles.selectedBank, { backgroundColor: theme.tint + '14', borderColor: theme.tint + '44' }]}>
              <Icon name="business" size={18} color={theme.tint} />
              <Text style={[Type.bodyMedium, { color: theme.text, flex: 1 }]}>
                {selectedBank.name}
              </Text>
              <Text style={[Type.caption, { color: theme.tint }]}>Change</Text>
            </Pressable>
          ) : banksLoading ? (
            <GlobalLoader backgroundColor="transparent" />
          ) : (
            <>
              <SearchField
                value={bankQuery}
                onChangeText={setBankQuery}
                placeholder="Search banks"
              />
              <View style={[styles.bankList, { borderColor: theme.border }]}>
                {filtered.slice(0, 40).map((b) => (
                  <Pressable
                    key={b.code}
                    onPress={() => {
                      setBankCode(b.code);
                      setResolvedName(null);
                      setError(null);
                    }}
                    style={({ pressed }) => [
                      styles.bankRow,
                      {
                        borderBottomColor: theme.border,
                        backgroundColor: pressed ? theme.backgroundElement : 'transparent',
                      },
                    ]}>
                    <Text style={[Type.body, { color: theme.text }]}>{b.name}</Text>
                  </Pressable>
                ))}
                {!filtered.length ? (
                  <Text style={[Type.callout, styles.noBanks, { color: theme.textSecondary }]}>
                    No bank matches “{bankQuery}”.
                  </Text>
                ) : null}
              </View>
            </>
          )}
        </View>

        {/* ── Account number ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[Type.h3, { color: theme.text }]}>Account number</Text>
          <TextInput
            value={accountNumber}
            onChangeText={(t) => {
              setAccountNumber(t.replace(/[^0-9]/g, '').slice(0, 10));
              setResolvedName(null);
              setError(null);
            }}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="10-digit NUBAN"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.backgroundElement },
            ]}
          />

          {resolvedName ? (
            <Animated.View
              entering={FadeIn}
              style={[styles.resolved, { backgroundColor: theme.success + '14', borderColor: theme.success + '44' }]}>
              <Icon name="checkmark-circle" size={20} color={theme.success} />
              <View style={{ flex: 1 }}>
                <Text style={[Type.caption, { color: theme.textSecondary }]}>
                  Account verified
                </Text>
                <Text style={[Type.bodyMedium, { color: theme.text }]}>{resolvedName}</Text>
              </View>
            </Animated.View>
          ) : null}

          {error ? (
            <Text selectable style={[Type.callout, { color: theme.danger }]}>
              {error}
            </Text>
          ) : null}
        </View>

        {resolvedName ? (
          <>
            <Button
              title="Use this account"
              size="lg"
              icon="checkmark-circle"
              loading={save.isPending}
              onPress={confirm}
            />
            <Text style={[Type.caption, { color: theme.textSecondary }]}>
              Withdrawals will be sent to {resolvedName}. Make sure this is you — we
              cannot recall a transfer once your bank has processed it.
            </Text>
          </>
        ) : (
          <Button
            title="Verify account"
            size="lg"
            icon="search"
            disabled={!canResolve}
            loading={resolving}
            onPress={verify}
          />
        )}
      </ScrollView>

      <SuccessModal
        visible={saved}
        onClose={() => {
          setSaved(false);
          router.back();
        }}
        title="Bank account linked"
        message={`Withdrawals will be sent to ${resolvedName ?? 'your account'}.`}
        icon="business"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.four },
  section: { gap: Spacing.twoHalf },
  currentHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  selectedBank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  bankList: {
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    maxHeight: 320,
  },
  bankRow: { padding: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  noBanks: { padding: Spacing.three },
  input: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    fontSize: 18,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  resolved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
