import { Stack } from 'expo-router';
import * as MailComposer from 'expo-mail-composer';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SUPPORT_EMAIL = 'support@handlancer.app';

const FAQ = [
  {
    q: 'How does escrow work?',
    a: 'You fund the agreed amount into escrow. Funds are only released to the provider when you approve — materials first if needed, then the final payment on completion.',
  },
  {
    q: 'When do providers get paid?',
    a: 'After you review the completed work and release the final payment, it lands in the provider’s wallet instantly.',
  },
  {
    q: 'What if I’m not happy with the work?',
    a: 'Open a dispute from the job. Our support team is emailed and will help resolve it before funds are released.',
  },
];

export function SupportScreen() {
  const theme = useTheme();
  const [status, setStatus] = useState<string | null>(null);

  async function contact() {
    const available = await MailComposer.isAvailableAsync();
    if (!available) {
      setStatus(`Email us at ${SUPPORT_EMAIL}`);
      return;
    }
    await MailComposer.composeAsync({
      recipients: [SUPPORT_EMAIL],
      subject: 'HandLancer support request',
    });
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Support' }} />

      <Text style={[styles.heading, { color: theme.text }]}>Frequently asked</Text>
      {FAQ.map((item) => (
        <Card key={item.q}>
          <Text style={[styles.q, { color: theme.text }]}>{item.q}</Text>
          <Text style={[styles.a, { color: theme.textSecondary }]}>{item.a}</Text>
        </Card>
      ))}

      <View style={styles.contact}>
        <Text style={[styles.contactTitle, { color: theme.text }]}>Still need help?</Text>
        <Button title="Contact support" icon="mail" onPress={contact} />
        {status ? (
          <Text selectable style={[styles.status, { color: theme.textSecondary }]}>
            {status}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingTop: Spacing.three },
  heading: { fontSize: 18, fontWeight: '700' },
  q: { fontSize: 16, fontWeight: '600' },
  a: { fontSize: 15, lineHeight: 21, marginTop: Spacing.two },
  contact: { gap: Spacing.two, marginTop: Spacing.three },
  contactTitle: { fontSize: 17, fontWeight: '700' },
  status: { fontSize: 14, textAlign: 'center' },
});
