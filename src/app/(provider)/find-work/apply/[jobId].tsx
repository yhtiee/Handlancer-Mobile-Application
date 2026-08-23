import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LineItemEditor } from '@/components/quotes/line-item-editor';
import { Button, Card, Icon, type IconName, MoneyText } from '@/components/ui';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { Radius, Spacing, Type } from '@/constants/theme';
import { formatDate, timeAgo } from '@/lib/date';
import type { QuoteLineItem } from '@/services/database.types';
import { useJob } from '@/queries/use-jobs';
import { useMyQuoteForJob, useSubmitQuote } from '@/queries/use-quotes';
import { useTheme } from '@/hooks/use-theme';

export default function ApplyToJob() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { data: job } = useJob(jobId);
  const { data: existing } = useMyQuoteForJob(jobId);
  const submit = useSubmitQuote(jobId);

  const [items, setItems] = useState<QuoteLineItem[]>([{ label: '', type: 'labor', amount: 0 }]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showFullBrief, setShowFullBrief] = useState(false);

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
        {/* What is being quoted for.
            Pricing a job from a screen that never named it meant leaving to
            re-read the brief and losing the half-built quote on the way back.
            The customer's budget is the number the provider is pricing against,
            so it is the most prominent thing here. */}
        {job ? (
          <Card>
            <View style={styles.jobHead}>
              <View style={[styles.jobIcon, { backgroundColor: theme.tint + '1F' }]}>
                <Icon name={categoryIcon(job.category)} size={20} color={theme.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={[Type.title, { color: theme.text }]}>
                  {job.title}
                </Text>
                <Text style={[Type.caption, { color: theme.textSecondary }]}>
                  {categoryLabel(job.category)} · posted {timeAgo(job.created_at)}
                </Text>
              </View>
            </View>

            <View style={[styles.budgetRow, { borderTopColor: theme.border }]}>
              <Text style={[Type.callout, { color: theme.textSecondary }]}>
                Customer&apos;s budget
              </Text>
              {job.budget != null ? (
                <MoneyText amount={job.budget} style={[Type.h3, { color: theme.text }]} />
              ) : (
                <Text style={[Type.bodyMedium, { color: theme.tint }]}>Open to quotes</Text>
              )}
            </View>

            <View style={styles.jobMeta}>
              <MetaLine icon="person-outline" text={job.owner?.name ?? 'HandLancer customer'} />
              {job.location ? <MetaLine icon="location-outline" text={job.location} /> : null}
              {job.scheduled_for ? (
                <MetaLine icon="calendar-outline" text={formatDate(job.scheduled_for)} />
              ) : null}
            </View>

            {job.description ? (
              <Text
                numberOfLines={showFullBrief ? undefined : 3}
                style={[Type.body, { color: theme.textSecondary, marginTop: Spacing.twoHalf }]}>
                {job.description}
              </Text>
            ) : null}

            {job.description && job.description.length > 120 ? (
              <Pressable hitSlop={8} onPress={() => setShowFullBrief((v) => !v)}>
                <Text style={[Type.caption, { color: theme.tint, marginTop: Spacing.two }]}>
                  {showFullBrief ? 'Show less' : 'Read full brief'}
                </Text>
              </Pressable>
            ) : null}
          </Card>
        ) : null}

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

/** One icon + one line of job context. Never wraps, so the card height is stable. */
function MetaLine({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metaLine}>
      <Icon name={icon} size={14} color={theme.textSecondary} />
      <Text numberOfLines={1} style={[Type.caption, { color: theme.textSecondary, flex: 1 }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.four },
  hint: { fontSize: 14, lineHeight: 20 },
  jobHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.twoHalf },
  jobIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.twoHalf,
    paddingTop: Spacing.twoHalf,
  },
  jobMeta: { gap: Spacing.one, marginTop: Spacing.twoHalf },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
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
