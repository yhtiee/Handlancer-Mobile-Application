import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Button, Icon, type IconName } from '@/components/ui';
import { Elevation, Radius, Spacing, Type } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useWalletSecurity } from '@/queries/use-wallet-security';
import { useTheme } from '@/hooks/use-theme';

export type PinConfirmDetail = { label: string; value: React.ReactNode };

/**
 * The last step before money leaves escrow.
 *
 * Escrow releases used to need only a confirmation tap, which is a weaker
 * control than the withdrawal it is equivalent to - the funds are just as gone
 * afterwards. This asks for the same transfer PIN, and (like the withdrawal
 * form) routes the user to set one when they have none, rather than failing at
 * the RPC with a message they cannot act on.
 *
 * The PIN itself is only ever passed to the caller's mutation, which sends it to
 * the SECURITY DEFINER function that moves the money. Nothing is compared here.
 */
export function PinConfirmModal({
  visible,
  onCancel,
  onConfirm,
  title,
  message,
  details,
  confirmLabel = 'Release funds',
  icon = 'lock-closed',
  loading = false,
  error,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (pin: string) => void;
  title: string;
  message?: string;
  details?: PinConfirmDetail[];
  confirmLabel?: string;
  icon?: IconName;
  loading?: boolean;
  error?: string | null;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const shell = profile?.role === 'provider' ? 'provider' : 'user';
  const { data: security } = useWalletSecurity();

  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Never leave a PIN sitting in state behind a closed sheet. Adjusted during
  // render rather than in an effect: the sheet stays mounted while hidden, so an
  // effect would clear it a render late (and cascade).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    setPin('');
    setLocalError(null);
  }

  const hasPin = Boolean(security?.hasPin);
  const locked = Boolean(security?.pinLocked);

  function submit() {
    if (!/^\d{4}$/.test(pin)) {
      setLocalError('Enter your 4-digit PIN');
      return;
    }
    setLocalError(null);
    onConfirm(pin);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} />
        <Animated.View
          entering={FadeInDown.springify().damping(18).mass(0.7)}
          style={[styles.sheet, { backgroundColor: theme.background, boxShadow: Elevation.lg }]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />

          <View style={styles.header}>
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.tint + '1F', borderColor: theme.tint + '33' },
              ]}>
              <Icon name={icon} size={26} color={theme.tint} />
            </View>
            <Text style={[Type.h3, styles.centered, { color: theme.text }]}>{title}</Text>
            {message ? (
              <Text style={[Type.body, styles.centered, { color: theme.textSecondary }]}>
                {message}
              </Text>
            ) : null}
          </View>

          {details?.length ? (
            <View style={[styles.details, { backgroundColor: theme.backgroundElement }]}>
              {details.map((d, i) => (
                <View
                  key={d.label}
                  style={[
                    styles.detailRow,
                    i > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: theme.border,
                    },
                  ]}>
                  <Text style={[Type.callout, { color: theme.textSecondary }]}>{d.label}</Text>
                  {d.value}
                </View>
              ))}
            </View>
          ) : null}

          {hasPin ? (
            <>
              <View style={{ gap: Spacing.one }}>
                <Text style={[Type.caption, { color: theme.textSecondary }]}>
                  Enter your transfer PIN to confirm
                </Text>
                <TextInput
                  value={pin}
                  onChangeText={(val) => {
                    setPin(val.replace(/[^0-9]/g, '').slice(0, 4));
                    setLocalError(null);
                  }}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  autoFocus
                  editable={!loading && !locked}
                  placeholder="••••"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.pinInput,
                    { color: theme.text, backgroundColor: theme.backgroundElement },
                  ]}
                />
              </View>

              {locked ? (
                <Text style={[Type.callout, styles.centered, { color: theme.danger }]}>
                  Too many incorrect PIN attempts. Try again in a few minutes.
                </Text>
              ) : null}

              {localError || error ? (
                <Text selectable style={[Type.callout, styles.centered, { color: theme.danger }]}>
                  {localError ?? error}
                </Text>
              ) : null}

              <View style={styles.actions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  disabled={loading}
                  onPress={onCancel}
                  style={{ flex: 1 }}
                />
                <Button
                  title={confirmLabel}
                  size="lg"
                  loading={loading}
                  disabled={locked}
                  onPress={submit}
                  style={{ flex: 1.6 }}
                />
              </View>
            </>
          ) : (
            /* No PIN yet: send them to set one instead of failing at the RPC. */
            <>
              <Text style={[Type.callout, styles.centered, { color: theme.textSecondary }]}>
                You need a transfer PIN before you can release funds. It takes a moment to
                set up and protects every payment you make.
              </Text>
              <View style={styles.actions}>
                <Button title="Cancel" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
                <Button
                  title="Set a PIN"
                  size="lg"
                  icon="lock-closed"
                  onPress={() => {
                    onCancel();
                    router.push(routes.walletPin(shell));
                  }}
                  style={{ flex: 1.6 }}
                />
              </View>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 11, 15, 0.55)' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: Radius.pill,
    alignSelf: 'center',
    marginBottom: Spacing.two,
  },
  header: { alignItems: 'center', gap: Spacing.two },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.one,
  },
  centered: { textAlign: 'center' },
  details: {
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.twoHalf,
  },
  pinInput: {
    height: 56,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 12,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
});
