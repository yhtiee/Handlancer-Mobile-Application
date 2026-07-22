import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { EscrowSection } from '@/components/escrow/escrow-section';
import { MediaGallery } from '@/components/media/media-gallery';
import { Button, Card, GlobalLoader, Icon, JobStatusPill, MoneyText, RatingStars, Screen } from '@/components/ui';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { Radius, Spacing } from '@/constants/theme';
import { formatDate, timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import { useJob, useUpdateJobStatus } from '@/queries/use-jobs';
import { useJobMedia } from '@/queries/use-media';
import { useMyReviewForJob } from '@/queries/use-reviews';
import { useTheme } from '@/hooks/use-theme';

export default function JobDetail() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const { data: media } = useJobMedia(id);
  const { data: myReview } = useMyReviewForJob(id);
  const updateStatus = useUpdateJobStatus(id);

  if (isLoading || !job) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <Stack.Screen options={{ title: 'Job' }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={{ color: theme.textSecondary }}>Job not found.</Text>
        )}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Job Details' }} />

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
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Photos & Videos</Text>
            <MediaGallery media={media} />
          </View>
        ) : null}

        {(job.status === 'in_progress' || job.status === 'completed') && (
          <EscrowSection job={job} />
        )}

        {job.status === 'completed' && job.hired_provider_id ? (
          myReview ? (
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your review</Text>
              <View style={{ marginTop: Spacing.two }}>
                <RatingStars rating={myReview.rating} size={16} showValue={false} />
              </View>
              {myReview.comment ? (
                <Text selectable style={[styles.body, { color: theme.textSecondary, marginTop: Spacing.two }]}>
                  {myReview.comment}
                </Text>
              ) : null}
            </Card>
          ) : (
            <Link href={routes.reviewJob(job.id)} asChild>
              <Button title="Leave a review" size="lg" icon="star" />
            </Link>
          )
        ) : null}

        {(job.status === 'in_progress' || job.status === 'completed') && job.hired_provider_id ? (
          <Link href={routes.disputeJob(job.id)} asChild>
            <Button title="Report a problem" variant="ghost" icon="warning-outline" />
          </Link>
        ) : null}

        {job.status === 'draft' ? (
          <Button
            title="Post publicly"
            size="lg"
            icon="send"
            loading={updateStatus.isPending}
            onPress={() => updateStatus.mutate('posted')}
          />
        ) : null}
        {(job.status === 'posted' || job.status === 'hiring') && (
          <Link href={routes.jobQuotes(job.id)} asChild>
            <Button title="Review quotes" size="lg" variant="secondary" icon="document-text" />
          </Link>
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
});
