import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as MailComposer from 'expo-mail-composer';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Icon } from '@/components/ui';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY, whatsappUrl } from '@/constants/support';
import { Radius, Spacing, Type } from '@/constants/theme';
import { formatDate } from '@/lib/date';
import { buildProviderResponse, categoryLabel, type DisputeCategory } from '@/lib/dispute-report';
import { useJobDispute } from '@/queries/use-disputes';
import { useJobMedia } from '@/queries/use-media';
import { useProvider } from '@/queries/use-providers';
import { useEscrow } from '@/queries/use-wallet';
import type { JobWithOwner } from '@/services/jobs';
import { useTheme } from '@/hooks/use-theme';

/**
 * What the provider sees when a job they were hired for is disputed.
 *
 * The push notification says the payment is on hold; this is the screen it
 * lands on, so it has to answer the two questions that notification raises —
 * what was alleged, and what can I do about it — without the provider having to
 * find a support address on their own.
 *
 * The client's own words are shown here deliberately. RLS already lets the
 * provider read the row ("dispute party", 0001), so hiding the allegation in
 * the UI would be theatre; and nobody can answer a case they have not been told.
 * What is withheld is the lock screen, where the push carries only the fact.
 */
export function ProviderDisputeBanner({ job }: { job: JobWithOwner }) {
  const theme = useTheme();
  const { data: dispute } = useJobDispute(job.id);
  const { data: escrow } = useEscrow(job.id);
  const { data: media } = useJobMedia(job.id);
  const { data: provider } = useProvider(job.hired_provider_id ?? '');
  const [note, setNote] = useState<string | null>(null);

  const message = () => buildProviderResponse({ job, escrow, provider, dispute, media });

  async function email() {
    setNote(null);
    if (!(await MailComposer.isAvailableAsync())) {
      setNote(`No mail app here. Email ${SUPPORT_EMAIL}, or copy your response below.`);
      return;
    }
    await MailComposer.composeAsync({
      recipients: [SUPPORT_EMAIL],
      subject: `${dispute?.reference ? `[${dispute.reference}] ` : ''}Provider response — ${job.title}`,
      body: message(),
    });
  }

  async function whatsapp() {
    setNote(null);
    try {
      await Linking.openURL(whatsappUrl(message()));
    } catch {
      setNote(`Could not open WhatsApp. Message ${SUPPORT_WHATSAPP_DISPLAY} directly.`);
    }
  }

  async function copy() {
    await Clipboard.setStringAsync(message());
    setNote('Response copied. Paste it into an email or message to support.');
  }

  return (
    <Animated.View
      entering={FadeIn}
      style={[
        styles.wrap,
        { backgroundColor: theme.danger + '10', borderColor: theme.danger + '33' },
      ]}>
      <View style={styles.head}>
        <Icon name="shield-half" size={18} color={theme.danger} />
        <Text style={[Type.title, { color: theme.text, flex: 1 }]}>This job is disputed</Text>
        {dispute?.reference ? (
          <Text selectable style={[Type.caption, { color: theme.danger }]}>
            {dispute.reference}
          </Text>
        ) : null}
      </View>

      <Text style={[Type.callout, { color: theme.textSecondary }]}>
        The client has raised a problem with this job
        {dispute ? ` on ${formatDate(dispute.created_at)}` : ''}. Anything still in escrow is on
        hold until our support team settles it — it has not been cancelled, and it has not been
        paid.
      </Text>

      {dispute?.category ? (
        <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[Type.caption, { color: theme.textSecondary }]}>RAISED AS</Text>
          <Text style={[Type.bodyMedium, { color: theme.text }]}>
            {categoryLabel(dispute.category as DisputeCategory)}
          </Text>
        </View>
      ) : null}

      {dispute?.reason ? (
        <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[Type.caption, { color: theme.textSecondary }]}>WHAT THE CLIENT SAID</Text>
          <Text selectable style={[Type.body, { color: theme.text }]}>
            {dispute.reason}
          </Text>
        </View>
      ) : null}

      <Text style={[Type.callout, { color: theme.text }]}>
        Send support your side. The more specific you are — dates you attended, what was agreed,
        receipts for materials, photos of the finished work — the faster this is settled.
      </Text>

      <View style={styles.actions}>
        <Button title="Respond by email" icon="mail" onPress={email} />
        <Button title="Respond on WhatsApp" variant="secondary" icon="logo-whatsapp" onPress={whatsapp} />
        <Pressable onPress={copy} hitSlop={8} style={styles.copy}>
          <Icon name="copy" size={14} color={theme.tint} />
          <Text style={[Type.callout, { color: theme.tint }]}>Copy my response</Text>
        </Pressable>
      </View>

      {note ? (
        <Text selectable style={[Type.caption, { color: theme.textSecondary }]}>
          {note}
        </Text>
      ) : null}

      <Text style={[Type.caption, { color: theme.textSecondary }]}>
        Do not chase the client for payment while this is open — support decides where the money
        goes, and you will be notified the moment it is settled.
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.twoHalf,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  row: {
    padding: Spacing.twoHalf,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    gap: Spacing.one,
  },
  actions: { gap: Spacing.two },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
});
