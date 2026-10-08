import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LineItemEditor } from '@/components/quotes/line-item-editor';
import { Button, formatMoney, GlassButton } from '@/components/ui';
import { Text, TextInput } from '@/components/ui/text';
import { Layout, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';
import { useJob } from '@/queries/use-jobs';
import { useMyQuoteForJob, useSubmitQuote } from '@/queries/use-quotes';
import type { QuoteLineItem } from '@/services/database.types';

/**
 * Write a quote. The job sits at the top in one line — who, where, their
 * budget — so the provider never leaves to re-read it. Then labour, materials
 * and a note. The total and how it sits against the budget stay pinned at the
 * bottom next to Send, so the number is always in view while typing.
 */
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
  const [checked, setChecked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);

  // Prefill from an existing quote on first load (updating a sent quote).
  useEffect(() => {
    if (existing && !hydrated) {
      setTimeout(() => {
        if (existing.line_items?.length) setItems(existing.line_items);
        if (existing.message) setMessage(existing.message);
        setHydrated(true);
      }, 0);
    }
  }, [existing, hydrated]);

  const updating = !!existing;
  const client = job?.owner?.name?.trim().split(' ')[0];
  const total = items.reduce((s, i) => s + (i.amount || 0), 0);
  const diff = job?.budget != null && total > 0 ? job.budget - total : null;

  async function send() {
    setError(null);
    setChecked(true);
    const incomplete = items.some((i) => !i.label.trim() !== !(i.amount > 0));
    const valid = items.filter((i) => i.label.trim() && i.amount > 0);
    if (incomplete) return setError('Finish or remove the highlighted line.');
    if (!valid.length) return setError('Add at least one line with a description and an amount.');
    try {
      await submit.mutateAsync({ lineItems: valid, message: message.trim() || null });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your quote did not send. Try again.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.toolbar, { paddingTop: insets.top + Spacing.one }]}>
          <GlassButton
            icon="chevron-back"
            accessibilityLabel="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.providerFindWork))}
          />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          {/* ── The job, in one line ─────────────────────────────── */}
          <View style={{ gap: Spacing.two }}>
            <Text style={[Type.caption, { color: theme.textSecondary }]}>
              {updating ? 'Update your quote for' : 'Quote for'}
            </Text>
            <Text style={[Type.serifTitle, { color: theme.text }]}>{job?.title ?? ' '}</Text>
            {job ? (
              <Text style={[Type.body, { color: theme.textSecondary }]}>
                {[client, job.location].filter(Boolean).join(' · ')}
                {job.budget != null ? (
                  <>
                    {' · budget '}
                    <Text style={{ color: theme.text, fontWeight: '600' }}>{formatMoney(job.budget)}</Text>
                  </>
                ) : (
                  ' · no budget given'
                )}
              </Text>
            ) : null}
            {job?.description ? (
              <Pressable onPress={() => setBriefOpen((v) => !v)} hitSlop={6}>
                <Text
                  numberOfLines={briefOpen ? undefined : 2}
                  style={[Type.body, { color: theme.text, lineHeight: 22 }]}>
                  {job.description}
                </Text>
                {job.description.length > 100 ? (
                  <Text style={[Type.caption, styles.more, { color: theme.textSecondary }]}>
                    {briefOpen ? 'Show less' : 'Read the whole brief'}
                  </Text>
                ) : null}
              </Pressable>
            ) : null}
          </View>

          {/* ── The price ───────────────────────────────────────── */}
          <LineItemEditor items={items} onChange={setItems} showErrors={checked} />

          {/* ── The note ────────────────────────────────────────── */}
          <View style={{ gap: Spacing.two }}>
            <Text style={[Type.h3, { color: theme.text }]}>A note for {client ?? 'the client'}</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="When you can come, how long it takes, anything included."
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.note, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>
        </ScrollView>

        {/* ── Pinned: the total, against the budget, and Send ─────── */}
        <View
          style={[
            styles.dock,
            { borderTopColor: theme.border, backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.two },
          ]}>
          {error ? (
            <Text selectable style={[Type.callout, { color: theme.danger }]}>
              {error}
            </Text>
          ) : null}
          <View style={styles.dockRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.total, { color: theme.text }]}>{formatMoney(total)}</Text>
              <Text style={[Type.caption, { color: theme.textSecondary }]}>
                {diff == null
                  ? 'Your total'
                  : diff === 0
                    ? 'Exactly their budget'
                    : diff > 0
                      ? `${formatMoney(diff)} under their budget`
                      : `${formatMoney(-diff)} over their budget`}
              </Text>
            </View>
            <Button
              title={updating ? 'Update quote' : 'Send quote'}
              size="lg"
              loading={submit.isPending}
              onPress={send}
              style={{ paddingHorizontal: Spacing.five }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  content: { paddingHorizontal: Layout.gutter, paddingTop: Spacing.two, paddingBottom: Spacing.five, gap: Spacing.five },
  more: { marginTop: Spacing.one, textDecorationLine: 'underline' },
  note: {
    minHeight: 110,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  dock: {
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.twoHalf,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  dockRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  total: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
});
