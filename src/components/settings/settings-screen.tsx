import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, Input, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { registerForPushNotifications } from '@/services/push';
import { clearPin, hasPin, setPin } from '@/services/security';
import { useTheme } from '@/hooks/use-theme';

export function SettingsScreen() {
  const theme = useTheme();

  const [pinEnabled, setPinEnabled] = useState(false);
  const [editingPin, setEditingPin] = useState(false);
  const [pin, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  useEffect(() => {
    hasPin().then(setPinEnabled);
  }, []);

  async function togglePin(next: boolean) {
    setPinError(null);
    if (next) {
      setEditingPin(true);
    } else {
      await clearPin();
      setPinEnabled(false);
      setEditingPin(false);
    }
  }

  async function savePin() {
    if (!/^\d{4}$/.test(pin)) {
      setPinError('Enter a 4-digit PIN');
      return;
    }
    await setPin(pin);
    setPinEnabled(true);
    setEditingPin(false);
    setPinValue('');
  }

  async function enablePush() {
    const token = await registerForPushNotifications();
    setPushStatus(token ? 'Notifications enabled on this device.' : 'Not available on this device.');
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Settings' }} />

      <View style={styles.section}>
        <Text style={[styles.heading, { color: theme.textSecondary }]}>Wallet security</Text>
        <Card>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: Spacing.three }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Require PIN to withdraw</Text>
              <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                Ask for a 4-digit PIN before any withdrawal.
              </Text>
            </View>
            <Switch value={pinEnabled || editingPin} onValueChange={togglePin} />
          </View>

          {editingPin ? (
            <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
              <Input
                label="New PIN"
                value={pin}
                onChangeText={setPinValue}
                error={pinError}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                placeholder="••••"
              />
              <Button title="Save PIN" onPress={savePin} />
            </View>
          ) : null}
        </Card>
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

const styles = StyleSheet.create({
  content: { gap: Spacing.four, paddingTop: Spacing.three },
  section: { gap: Spacing.two },
  heading: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  rowBetween: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 14, lineHeight: 19, marginTop: 2 },
  version: { fontSize: 13, textAlign: 'center', marginTop: Spacing.two },
});
