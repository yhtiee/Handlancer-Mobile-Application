import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as MailComposer from 'expo-mail-composer';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useJob } from '@/queries/use-jobs';
import { createDispute } from '@/services/disputes';
import { useTheme } from '@/hooks/use-theme';

const SUPPORT_EMAIL = 'support@handlancer.app';

export default function DisputeJob() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { session } = useAuth();
  const { data: job } = useJob(jobId);

  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (reason.trim().length < 10) return setError('Please describe the issue (at least 10 characters)');
    if (!session) return;
    setSubmitting(true);
    try {
      await createDispute({ jobId, openedBy: session.user.id, reason: reason.trim() });

      // Email the support team (opens the device mail app if available).
      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          recipients: [SUPPORT_EMAIL],
          subject: `Dispute: ${job?.title ?? jobId}`,
          body: `Job: ${job?.title ?? ''} (${jobId})\n\nIssue:\n${reason.trim()}`,
        });
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the dispute.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Report a Problem' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Text style={[styles.intro, { color: theme.textSecondary }]}>
          Tell us what went wrong. Opening a dispute pauses the job and emails our support team,
          who will help resolve it before any funds are released.
        </Text>

        <TextInput
          value={reason}
          onChangeText={(val) => {
            setReason(val);
            if (val.trim().length >= 10) setError(null);
          }}
          placeholder="Describe the issue…"
          placeholderTextColor={theme.textSecondary}
          multiline
          autoFocus
          style={[styles.textArea, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        {error ? (
          <Text selectable style={[styles.error, { color: theme.danger }]}>
            {error}
          </Text>
        ) : null}

        <Button
          title="Submit dispute"
          size="lg"
          variant="destructive"
          icon="warning"
          loading={submitting}
          onPress={submit}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.four },
  intro: { fontSize: 15, lineHeight: 21 },
  textArea: {
    minHeight: 140,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  error: { fontSize: 14 },
});
