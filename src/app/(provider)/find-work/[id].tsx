import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card, GlobalLoader, Icon, JobStatusPill, MoneyText, QuoteStatusPill, Screen } from '@/components/ui';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { Radius, Spacing } from '@/constants/theme';
import { formatDate, timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import { useJob } from '@/queries/use-jobs';
import { useMyQuoteForJob } from '@/queries/use-quotes';
import { useJobMedia } from '@/queries/use-media';
import { MediaGallery } from '@/components/media/media-gallery';
import { useTheme } from '@/hooks/use-theme';

export default function FindWorkJob() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const { data: myQuote } = useMyQuoteForJob(id);
  const { data: media } = useJobMedia(id);

  if (isLoading || !job) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: '' }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={{ color: theme.textSecondary }}>Job not found.</Text>
        )}
      </View>
    );
  }

  const canApply = job.status === 'posted' || job.status === 'hiring';

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: theme.tint + '22' }]}>
            <Icon name={categoryIcon(job.category)} size={28} color={theme.tint} />
          </View>
          <Text selectable style={[styles.title, { color: theme.text }]}>
            {job.title}
          </Text>
          <View style={styles.metaRow}>
            <JobStatusPill status={job.status} />
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {categoryLabel(job.category)} · posted {timeAgo(job.created_at)}
            </Text>
          </View>
        </View>

        {/* Who posted this. A provider deciding whether to bid was previously
            shown everything about the job except the person behind it. */}
        <Card>
          <View style={styles.customerRow}>
            <Avatar uri={job.owner?.avatar_url} name={job.owner?.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.customerLabel, { color: theme.textSecondary }]}>
                POSTED BY
              </Text>
              <Text numberOfLines={1} style={[styles.customerName, { color: theme.text }]}>
                {job.owner?.name ?? 'HandLancer customer'}
              </Text>
              {job.owner?.location ? (
                <Text numberOfLines={1} style={[styles.meta, { color: theme.textSecondary }]}>
                  {job.owner.location}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        <Card>
          <Row label="Budget">
            {job.budget != null ? (
              <MoneyText amount={job.budget} style={{ fontSize: 15 }} />
            ) : (
              <Text style={{ color: theme.textSecondary }}>Open to quotes</Text>
            )}
          </Row>
          {job.location ? (
            <>
              <Divider />
              <Row label="Location">
                <Text selectable style={[styles.value, { color: theme.text }]}>
                  {job.location}
                </Text>
              </Row>
            </>
          ) : null}
          {job.scheduled_for ? (
            <>
              <Divider />
              <Row label="Scheduled">
                <Text style={[styles.value, { color: theme.text }]}>
                  {formatDate(job.scheduled_for)}
                </Text>
              </Row>
            </>
          ) : null}
          {job.is_direct ? (
            <>
              <Divider />
              <Row label="Invitation">
                <Text style={[styles.value, { color: theme.tint }]}>Direct invite</Text>
              </Row>
            </>
          ) : null}
        </Card>

        {job.description ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
            <Text selectable style={[styles.body, { color: theme.textSecondary }]}>
              {job.description}
            </Text>
          </View>
        ) : null}

        {media && media.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Photos / Videos</Text>
            <MediaGallery media={media} />
          </View>
        ) : null}

        {myQuote ? (
          <Card>
            <View style={styles.quoteHead}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your quote</Text>
              <QuoteStatusPill status={myQuote.status} />
            </View>
            <View style={styles.quoteTotalRow}>
              <Text style={{ color: theme.textSecondary }}>Total submitted</Text>
              <MoneyText amount={myQuote.total} style={{ fontSize: 16 }} />
            </View>
            {myQuote.status !== 'approved' ? (
              <Link href={routes.applyToJob(job.id)} asChild>
                <Button
                  title="Update quote"
                  variant="secondary"
                  icon="pencil"
                  style={{ marginTop: Spacing.three }}
                />
              </Link>
            ) : null}
          </Card>
        ) : canApply ? (
          <Link href={routes.applyToJob(job.id)} asChild>
            <Button title="Submit a quote" size="lg" icon="send" />
          </Link>
        ) : (
          <Text style={[styles.closed, { color: theme.textSecondary }]}>
            This job is no longer accepting quotes.
          </Text>
        )}
      </Screen>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { gap: Spacing.four, paddingTop: Spacing.three },
  header: { gap: Spacing.two },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 28, height: 28 },
  title: { fontSize: 26, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  meta: { fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.two },
  rowLabel: { fontSize: 15 },
  value: { fontSize: 15, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  customerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  customerName: { fontSize: 17, fontWeight: '600', marginTop: 1 },
  quoteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quoteTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.two },
  closed: { fontSize: 15, textAlign: 'center' },
});
