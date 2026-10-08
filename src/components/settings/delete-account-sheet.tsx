import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, formatMoney } from '@/components/ui';
import { Text, TextInput } from '@/components/ui/text';
import { Layout, Radius, Scrim, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useMyJobsCount, useProviderJobsCount } from '@/queries/use-jobs';
import { useWallet } from '@/queries/use-wallet';
import { AccountDeletionBlocked, deleteMyAccount } from '@/services/account';

const CONFIRM_WORD = 'DELETE';

/**
 * Deleting an account, in one sheet: what goes, what stays with the other
 * side of each job, anything that has to be settled first, and a typed
 * confirmation. The server enforces the same rules (migration 0022); this
 * just says them before you hit them.
 */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return <Body onClose={onClose} />;
}

function Body({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const provider = profile?.role === 'provider';
  const shell = provider ? 'provider' : 'user';

  const { data: wallet } = useWallet();
  const clientActive = useMyJobsCount('active').data ?? 0;
  const providerActive = useProviderJobsCount('active').data ?? 0;
  const active = provider ? providerActive : clientActive;
  const balance = wallet?.balance ?? 0;

  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = balance > 0 || active > 0;
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  async function confirm() {
    if (!session?.user.id) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount(session.user.id);
      onClose();
      router.replace('/(auth)/welcome');
    } catch (e) {
      setError(
        e instanceof AccountDeletionBlocked
          ? e.message
          : 'Your account was not deleted. Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  function go(href: Parameters<typeof router.push>[0]) {
    onClose();
    router.push(href);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onClose} />
          <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.four }]}>
            <View style={[styles.grabber, { backgroundColor: theme.backgroundSelected }]} />
            <Text style={[Type.serifTitle, { color: theme.text }]}>Delete your account?</Text>

            <View style={{ gap: Spacing.twoHalf }}>
              <Point>Your name, photo, phone, location and bank details are erased, and you’re signed out.</Point>
              <Point>
                {provider
                  ? 'Quotes you’ve sent that are still waiting are withdrawn.'
                  : 'Jobs you’ve posted that nobody is working on yet are closed.'}
              </Point>
              <Point>
                Finished jobs, payments and reviews stay on the other person’s side, shown as “Deleted user”.
              </Point>
              <Point strong>This can’t be undone.</Point>
            </View>

            {/* Anything that has to be settled first, with the way to settle it. */}
            {blocked ? (
              <View style={[styles.blocker, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[Type.bodyMedium, { color: theme.text }]}>Settle these first</Text>
                {balance > 0 ? (
                  <View style={styles.blockRow}>
                    <Text style={[Type.callout, { color: theme.textSecondary, flex: 1 }]}>
                      {formatMoney(balance)} is still in your wallet.
                    </Text>
                    <Button title="Go to wallet" variant="secondary" style={styles.small} onPress={() => go(routes.wallet(shell))} />
                  </View>
                ) : null}
                {active > 0 ? (
                  <View style={styles.blockRow}>
                    <Text style={[Type.callout, { color: theme.textSecondary, flex: 1 }]}>
                      {active === 1 ? 'A job is' : `${active} jobs are`} still under way.
                    </Text>
                    <Button
                      title="See jobs"
                      variant="secondary"
                      style={styles.small}
                      onPress={() => go(provider ? ('/(provider)/(tabs)/(jobs)' as never) : ('/(user)/(tabs)/(jobs)' as never))}
                    />
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={{ gap: Spacing.two }}>
                <Text style={[Type.caption, { color: theme.textSecondary }]}>
                  Type {CONFIRM_WORD} to confirm
                </Text>
                <TextInput
                  value={typed}
                  onChangeText={setTyped}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder={CONFIRM_WORD}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
              </View>
            )}

            {error ? (
              <Text selectable style={[Type.callout, { color: theme.danger }]}>
                {error}
              </Text>
            ) : null}

            <View style={{ gap: Spacing.two }}>
              <Button
                title="Delete my account"
                variant="destructive"
                size="lg"
                disabled={blocked || !confirmed}
                loading={busy}
                onPress={confirm}
              />
              <Button title="Keep my account" variant="ghost" disabled={busy} onPress={onClose} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Point({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.point}>
      <View style={[styles.bullet, { backgroundColor: strong ? theme.danger : theme.textSecondary }]} />
      <Text style={[strong ? Type.bodyMedium : Type.body, { color: theme.text, flex: 1 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: `rgba(${Scrim},0.5)` },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderCurve: 'continuous',
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.two,
    gap: Spacing.four,
  },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center' },
  point: { flexDirection: 'row', gap: Spacing.twoHalf, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  blocker: { borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.three, gap: Spacing.twoHalf },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.twoHalf },
  small: { height: 40, paddingHorizontal: Spacing.three },
  input: {
    height: 52,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    fontSize: 17,
    letterSpacing: 2,
  },
});
