import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, GlobalLoader, JobStatusPill, MoneyText, QuoteStatusPill, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import { useQuote } from '@/queries/use-quotes';
import { useTheme } from '@/hooks/use-theme';

export default function ProviderQuoteDetail() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: quote, isLoading } = useQuote(id);

  if (isLoading || !quote) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: '' }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={{ color: theme.textSecondary }}>Quote not found.</Text>
        )}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Your Quote' }} />
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text selectable style={[styles.title, { color: theme.text }]}>
            {quote.job?.title ?? 'Job'}
          </Text>
          <View style={styles.metaRow}>
            <QuoteStatusPill status={quote.status} />
            {quote.job ? <JobStatusPill status={quote.job.status} /> : null}
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {timeAgo(quote.created_at)}
            </Text>
          </View>
        </View>

        <Card>
          {quote.line_items.map((item, i) => (
            <View key={i} style={styles.line}>
              <Text style={[styles.lineLabel, { color: theme.text }]}>
                {item.label || (item.type === 'material' ? 'Material' : 'Labour')}
              </Text>
              <MoneyText amount={item.amount} style={{ fontSize: 14, fontWeight: '500' }} />
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
            <MoneyText amount={quote.total} style={{ fontSize: 18 }} />
          </View>
        </Card>

        {quote.message ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your message</Text>
            <Text selectable style={[styles.body, { color: theme.textSecondary }]}>
              {quote.message}
            </Text>
          </View>
        ) : null}

        {quote.status === 'approved' && quote.job?.status === 'in_progress' ? (
          <View style={styles.statusBox}>
            <Text style={[styles.approved, { color: theme.success }]}>
              🎉 Quote Approved & Escrow Funded! You&apos;ve been hired for this job.
            </Text>
            <Link href={routes.providerJobDetail(quote.job_id)} asChild>
              <Button title="Go to active job" icon="briefcase" style={{ marginTop: Spacing.two }} />
            </Link>
          </View>
        ) : quote.status === 'approved' ? (
          <View style={[styles.pendingCard, { backgroundColor: theme.tint + '14', borderColor: theme.tint + '33' }]}>
            <Text style={[styles.pendingTitle, { color: theme.tint }]}>
              ⏳ Quote Approved — Awaiting Escrow Payment
            </Text>
            <Text style={[styles.pendingBody, { color: theme.textSecondary }]}>
              The customer selected your quote! Work officially begins as soon as their escrow payment is confirmed.
            </Text>
          </View>
        ) : quote.job && (quote.job.status === 'posted' || quote.job.status === 'hiring') ? (
          <Link href={routes.applyToJob(quote.job_id)} asChild>
            <Button title="Update quote" variant="secondary" icon="pencil" />
          </Link>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { gap: Spacing.four, paddingTop: Spacing.three },
  header: { gap: Spacing.two },
  title: { fontSize: 24, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  meta: { fontSize: 14 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.one + 2 },
  lineLabel: { fontSize: 15 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.two },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  approved: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  statusBox: { gap: Spacing.two, alignItems: 'center' },
  pendingCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.one,
  },
  pendingTitle: { fontSize: 15, fontWeight: '700' },
  pendingBody: { fontSize: 14, lineHeight: 20 },
});
