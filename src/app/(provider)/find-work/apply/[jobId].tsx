import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LineItemEditor } from '@/components/quotes/line-item-editor';
import { Button } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { QuoteLineItem } from '@/services/database.types';
import { useMyQuoteForJob, useSubmitQuote } from '@/queries/use-quotes';
import { useTheme } from '@/hooks/use-theme';

export default function ApplyToJob() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { data: existing } = useMyQuoteForJob(jobId);
  const submit = useSubmitQuote(jobId);

  const [items, setItems] = useState<QuoteLineItem[]>([{ label: '', type: 'labor', amount: 0 }]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Prefill from an existing quote on first load (resubmission).
  useEffect(() => {
    if (existing && !hydrated) {
      setTimeout(() => {
        if (existing.line_items?.length) setItems(existing.line_items);
        if (existing.message) setMessage(existing.message);
        setHydrated(true);
      }, 0);
    }
  }, [existing, hydrated]);

  const isResubmit = !!existing;

  async function handleSubmit() {
    setError(null);
    const valid = items.filter((i) => i.label.trim() && i.amount > 0);
    if (!valid.length) {
      setError('Add at least one line item with an amount');
      return;
    }
    try {
      await submit.mutateAsync({ lineItems: valid, message: message.trim() || null });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your quote.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: isResubmit ? 'Update Quote' : 'Build Quote' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
        <ScrollView
          keyboardDismissMode="interactive"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Break down your price into materials and labour. The customer sees this breakdown.
        </Text>

        <LineItemEditor items={items} onChange={setItems} />

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Message (optional)</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Introduce yourself, timeline, guarantees…"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.textArea, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        </View>

        {error ? (
          <Text selectable style={[styles.error, { color: theme.danger }]}>
            {error}
          </Text>
        ) : null}

        <Button
          title={isResubmit ? 'Resubmit quote' : 'Submit quote'}
          size="lg"
          icon="send"
          loading={submit.isPending}
          onPress={handleSubmit}
        />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.four },
  hint: { fontSize: 14, lineHeight: 20 },
  field: { gap: Spacing.one },
  label: { fontSize: 13, fontWeight: '600' },
  textArea: {
    minHeight: 100,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  error: { fontSize: 14 },
});
