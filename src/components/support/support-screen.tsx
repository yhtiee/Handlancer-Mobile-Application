import * as Linking from 'expo-linking';
import * as MailComposer from 'expo-mail-composer';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen } from '@/components/ui';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY, whatsappUrl } from '@/constants/support';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
    a: 'Open “Report a problem” on the job instead of approving it. That freezes everything still in escrow, notifies the provider, and gives you a reference plus a ready-written report to send us. Nothing is released while a dispute is open.',
  },
  {
    q: 'Can I get my money back once I’ve approved?',
    a: 'Not from inside the app — approving releases the payment for good. If you are unsure about the work, dispute it first; that is what the escrow is for.',
  },
];

export function SupportScreen() {
  const theme = useTheme();
  const [status, setStatus] = useState<string | null>(null);

  async function email() {
    setStatus(null);
    if (!(await MailComposer.isAvailableAsync())) {
      setStatus(`No mail app is set up on this phone. Email us at ${SUPPORT_EMAIL}.`);
      return;
    }
    await MailComposer.composeAsync({
      recipients: [SUPPORT_EMAIL],
      subject: 'HandLancer support request',
      // Asking for these up front saves the first reply being a request for them.
      body: '\n\n—\nSo we can help faster, please include:\n• What you were trying to do\n• The job title, if it is about a job\n• Screenshots, if you have them\n',
    });
  }

  async function whatsapp() {
    setStatus(null);
    try {
      await Linking.openURL(whatsappUrl('Hello HandLancer support, I need help with '));
    } catch {
      setStatus(`Could not open WhatsApp. Message us on ${SUPPORT_WHATSAPP_DISPLAY}.`);
    }
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
        <Button title="Email support" icon="mail" onPress={email} />
        <Button
          title="Chat on WhatsApp"
          variant="secondary"
          icon="logo-whatsapp"
          onPress={whatsapp}
        />
        <Text selectable style={[styles.status, { color: theme.textSecondary }]}>
          {status ?? `${SUPPORT_EMAIL} · ${SUPPORT_WHATSAPP_DISPLAY}`}
        </Text>
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
