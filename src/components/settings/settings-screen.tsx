import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Icon, type IconName, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useWalletSecurity } from '@/queries/use-wallet-security';
import { registerForPushNotifications } from '@/services/push';
import { useTheme } from '@/hooks/use-theme';

export function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const shell = profile?.role === 'provider' ? 'provider' : 'user';
  const { data: security } = useWalletSecurity();

  const [pushStatus, setPushStatus] = useState<string | null>(null);

  async function enablePush() {
    const token = await registerForPushNotifications();
    setPushStatus(token ? 'Notifications enabled on this device.' : 'Not available on this device.');
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Settings' }} />

      <View style={styles.section}>
        <Text style={[styles.heading, { color: theme.textSecondary }]}>Wallet security</Text>
        <Card padded={false}>
          {/* The PIN is no longer a toggle. It is mandatory for withdrawals and
              lives on the server, so there is nothing to switch off — only to
              set or change. */}
          <SecurityRow
            icon="lock-closed"
            title={security?.hasPin ? 'Transfer PIN' : 'Set a transfer PIN'}
            hint={
              security?.hasPin
                ? 'Required on every withdrawal'
                : 'Required before you can withdraw'
            }
            state={security?.hasPin ? 'done' : 'todo'}
            onPress={() => router.push(routes.walletPin(shell))}
          />
          <Divider />
          <SecurityRow
            icon="business"
            title={security?.hasBank ? 'Payout bank account' : 'Link a bank account'}
            hint={
              security?.hasBank
                ? `${security.bankName} · ${security.accountMasked}`
                : 'Verified with your bank before any payout'
            }
            state={security?.hasBank ? 'done' : 'todo'}
            onPress={() => router.push(routes.walletBank(shell))}
          />
        </Card>
        <Text style={[styles.note, { color: theme.textSecondary }]}>
          Your PIN is stored encrypted and never kept on this device. Five wrong
          attempts lock withdrawals for 15 minutes.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: theme.textSecondary }]}>Notifications</Text>
        <Card>
          <Text style={[styles.rowTitle, { color: theme.text }]}>Push notifications</Text>
          <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
            Get alerts for quotes, hires, messages and payments.
          </Text>
          <Button
            title="Enable on this device"
            variant="secondary"
            icon="notifications"
            onPress={enablePush}
            style={{ marginTop: Spacing.three }}
          />
          {pushStatus ? (
            <Text style={[styles.rowSub, { color: theme.textSecondary, marginTop: Spacing.two }]}>
              {pushStatus}
            </Text>
          ) : null}
        </Card>
      </View>

      <Text style={[styles.version, { color: theme.textSecondary }]}>
        HandLancer v{Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </Screen>
  );
}

function SecurityRow({
  icon,
  title,
  hint,
  state,
  onPress,
}: {
  icon: IconName;
  title: string;
  hint: string;
  state: 'done' | 'todo';
  onPress: () => void;
}) {
  const theme = useTheme();
  const done = state === 'done';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.securityRow,
        { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
      ]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: done ? theme.success + '1F' : theme.warning + '1F' },
        ]}>
        <Icon name={icon} size={18} color={done ? theme.success : theme.warning} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{hint}</Text>
      </View>
      {done ? null : (
        <View style={[styles.todoPill, { backgroundColor: theme.warning + '1F' }]}>
          <Text style={[styles.todoText, { color: theme.warning }]}>REQUIRED</Text>
        </View>
      )}
      <Icon name="chevron-forward" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />;
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four, paddingTop: Spacing.three },
  section: { gap: Spacing.two },
  heading: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 14, lineHeight: 19, marginTop: 2 },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    padding: Spacing.three,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoPill: { paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.pill },
  todoText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  note: { fontSize: 13, lineHeight: 18 },
  version: { fontSize: 13, textAlign: 'center', marginTop: Spacing.two },
});
