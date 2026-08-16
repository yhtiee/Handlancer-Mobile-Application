import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Icon, SuccessModal } from '@/components/ui';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useSetTransferPin, useWalletSecurity } from '@/queries/use-wallet-security';
import { useTheme } from '@/hooks/use-theme';

/**
 * Set or change the 4-digit transfer PIN.
 *
 * The PIN is never stored on the device and never compared here — it is sent to
 * `set_transfer_pin`, hashed with bcrypt in Postgres, and only ever checked
 * inside the function that debits the wallet.
 */
export function TransferPinScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: security } = useWalletSecurity();
  const savePin = useSetTransferPin();

  const changing = Boolean(security?.hasPin);
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (changing && currentPin.length !== 4) return setError('Enter your current PIN');
    if (!/^\d{4}$/.test(pin)) return setError('Choose a 4-digit PIN');
    if (pin !== confirmPin) return setError('The two PINs do not match');

    try {
      await savePin.mutateAsync({ pin, currentPin: changing ? currentPin : undefined });
      setDone(true);
    } catch (e) {
      // Server-side rules (weak PIN, wrong current PIN) surface here verbatim,
      // including Postgres' hint — see rpcError in services/security.ts.
      const msg = e instanceof Error && e.message ? e.message : null;
      setError(msg ?? 'Could not save your PIN. Please try again.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: changing ? 'Change PIN' : 'Set Transfer PIN' }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Card>
          <View style={styles.head}>
            <Icon name="lock-closed" size={18} color={theme.tint} />
            <Text style={[Type.bodyMedium, { color: theme.text }]}>
              Your PIN protects withdrawals
            </Text>
          </View>
          <Text style={[Type.callout, { color: theme.textSecondary, marginTop: Spacing.two }]}>
            You will be asked for it every time money leaves your wallet. It is stored
            encrypted on our servers — we cannot see it, and it is never kept on this
            device. Five wrong tries locks withdrawals for 15 minutes.
          </Text>
        </Card>

        {changing ? (
          <PinField label="Current PIN" value={currentPin} onChange={setCurrentPin} />
        ) : null}
        <PinField label={changing ? 'New PIN' : 'Choose a PIN'} value={pin} onChange={setPin} />
        <PinField label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />

        {error ? (
          <Text selectable style={[Type.callout, { color: theme.danger }]}>
            {error}
          </Text>
        ) : null}

        <Button
          title={changing ? 'Update PIN' : 'Set PIN'}
          size="lg"
          icon="lock-closed"
          loading={savePin.isPending}
          onPress={submit}
        />
      </ScrollView>

      <SuccessModal
        visible={done}
        onClose={() => {
          setDone(false);
          router.back();
        }}
        title={changing ? 'PIN updated' : 'PIN set'}
        message="You will be asked for this PIN on every withdrawal."
        icon="lock-closed"
      />
    </View>
  );
}

function PinField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      <Text style={[Type.callout, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        placeholder="••••"
        placeholderTextColor={theme.textSecondary}
        style={[styles.pin, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.four },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pin: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    fontSize: 26,
    letterSpacing: 14,
    textAlign: 'center',
  },
});
