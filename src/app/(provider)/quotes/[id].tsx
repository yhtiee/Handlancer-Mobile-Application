import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, formatMoney, GlassButton, GlobalLoader } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Layout, Radius, Spacing, Type } from '@/constants/theme';
import { useContentInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import { useProvider } from '@/queries/use-providers';
import { useQuote } from '@/queries/use-quotes';
import type { QuoteLineItem } from '@/services/database.types';

/**
 * One sent quote: where it stands in a sentence, what it charges (labour and
 * materials, as the escrow pays them), the note, and the one thing to do.
 */
export default function ProviderQuoteDetail() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottom = useContentInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: quote, isLoading } = useQuote(id);
  const { data: client } = useProvider(quote?.job?.owner_id ?? '');

  if (isLoading || !quote) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={[Type.body, { color: theme.textSecondary }]}>Quote not found.</Text>
        )}
      </View>
    );
  }

  const who = client?.name?.trim().split(' ')[0] ?? 'The client';
  const job = quote.job;
  const jobOpen = job?.status === 'posted' || job?.status === 'hiring';
  const hired = quote.status === 'approved' && (job?.status === 'in_progress' || job?.status === 'completed' || job?.status === 'disputed');

  const state =
    quote.status === 'rejected'
      ? { headline: 'Not chosen', detail: `${who} went with another quote.` }
      : hired
        ? { headline: 'You’re hired', detail: `${who} paid into escrow. The job is under way.` }
        : quote.status === 'approved'
          ? { headline: 'Accepted', detail: `Waiting for ${who} to pay into escrow. Don’t start until they do.` }
          : jobOpen
            ? { headline: `Waiting for ${who} to decide`, detail: 'You can change your quote until they accept one.' }
            : { headline: 'This job is closed', detail: 'The client is no longer taking quotes.' };

  const labour = quote.line_items.filter((i) => i.type === 'labor');
  const materials = quote.line_items.filter((i) => i.type === 'material');

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.toolbar, { paddingTop: insets.top + Spacing.one }]}>
        <GlassButton
          icon="chevron-back"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.providerQuotes))}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
        <View style={{ gap: Spacing.two }}>
          <Text style={[Type.caption, { color: theme.textSecondary }]}>Your quote for</Text>
          <Text selectable style={[Type.serifTitle, { color: theme.text }]}>
            {job?.title ?? 'Job'}
          </Text>
          <Text style={[Type.body, { color: theme.textSecondary }]}>
            {[client?.name, job?.location, `sent ${timeAgo(quote.created_at)}`].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {/* ── Where it stands ─────────────────────────────────────── */}
        <View style={[styles.panel, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[Type.serifTitle, { color: theme.text, fontSize: 22, lineHeight: 28 }]}>{state.headline}</Text>
          <Text style={[Type.body, { color: theme.textSecondary }]}>{state.detail}</Text>
          {hired ? (
            <Button
              title="Go to the job"
              style={{ marginTop: Spacing.two, backgroundColor: theme.background }}
              variant="secondary"
              onPress={() => router.push(routes.providerJobDetail(quote.job_id))}
            />
          ) : jobOpen && quote.status !== 'rejected' && quote.status !== 'approved' ? (
            <Button
              title="Change my quote"
              variant="secondary"
              style={{ marginTop: Spacing.two, backgroundColor: theme.background }}
              onPress={() => router.push(routes.applyToJob(quote.job_id))}
            />
          ) : null}
        </View>

        {/* ── What it charges ─────────────────────────────────────── */}
        <View style={{ gap: Spacing.four }}>
          <Lines title="Labour" items={labour} total={quote.labor_cost} />
          {materials.length ? <Lines title="Materials" items={materials} total={quote.materials_cost} /> : null}
          <View style={[styles.totalRow, { borderTopColor: theme.text }]}>
            <Text style={[Type.title, { color: theme.text }]}>Total</Text>
            <Text style={[styles.total, { color: theme.text }]}>{formatMoney(quote.total)}</Text>
          </View>
          {job?.budget != null ? (
            <Text style={[Type.caption, { color: theme.textSecondary, marginTop: -Spacing.two }]}>
              Their budget was {formatMoney(job.budget)}
            </Text>
          ) : null}
        </View>

        {quote.message ? (
          <View style={{ gap: Spacing.two }}>
            <Text style={[Type.h3, { color: theme.text }]}>Your note</Text>
            <Text selectable style={[styles.quote, { color: theme.text }]}>
              “{quote.message}”
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Lines({ title, items, total }: { title: string; items: QuoteLineItem[]; total: number }) {
  const theme = useTheme();
  return (
    <View>
      <View style={styles.lineHead}>
        <Text style={[Type.h3, { color: theme.text }]}>{title}</Text>
        <Text style={[Type.bodyMedium, styles.num, { color: theme.text }]}>{formatMoney(total)}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={[styles.line, { borderBottomColor: theme.border }]}>
          <Text style={[Type.body, { color: theme.textSecondary, flex: 1 }]}>{item.label}</Text>
          <Text style={[Type.body, styles.num, { color: theme.textSecondary }]}>{formatMoney(item.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  content: { paddingHorizontal: Layout.gutter, paddingTop: Spacing.two, gap: Spacing.five },
  panel: { borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.threeHalf, gap: Spacing.two },
  lineHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.one },
  line: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.twoHalf,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  num: { fontVariant: ['tabular-nums'] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: Spacing.three,
    borderTopWidth: 1.5,
  },
  total: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  quote: { ...Type.serifTitle, fontSize: 17, lineHeight: 24, fontStyle: 'italic' },
});
