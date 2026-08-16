import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { EscrowSection } from '@/components/escrow/escrow-section';
import { EscrowTimeline } from '@/components/escrow/escrow-timeline';
import { MediaGallery } from '@/components/media/media-gallery';
import {
  Button,
  Card,
  GlobalLoader,
  Icon,
  JobStatusPill,
  MoneyText,
  RatingStars,
  Screen,
} from '@/components/ui';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { Radius, Spacing, Type } from '@/constants/theme';
import { formatDate, timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import { useJob, useUpdateJobStatus } from '@/queries/use-jobs';
import { useJobMedia } from '@/queries/use-media';
import { useMyReviewForJob } from '@/queries/use-reviews';
import { useEscrow } from '@/queries/use-wallet';
import { useTheme } from '@/hooks/use-theme';

export default function JobDetail() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const { data: media } = useJobMedia(id);
  const { data: myReview } = useMyReviewForJob(id);
  const { data: escrow } = useEscrow(id);
  const updateStatus = useUpdateJobStatus(id);

  if (isLoading || !job) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Job' }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={[Type.body, { color: theme.textSecondary }]}>Job not found.</Text>
        )}
      </View>
    );
  }

  const live = Boolean(escrow) && escrow!.status !== 'pending';
  // The final release pays out everything still held, materials included, so it
  // zeroes the balance regardless of whether materials went out separately.
  const held = !escrow
    ? 0
    : escrow.workmanship_released
      ? 0
      : escrow.total - (escrow.materials_released ? escrow.materials_amount : 0);

  return (
    <>
      <Stack.Screen options={{ title: 'Job Details' }} />

      <Screen contentContainerStyle={styles.content}>
        {/* ── Hero ───────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn} style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: theme.tint + '1F' }]}>
            <Icon name={categoryIcon(job.category)} size={28} color={theme.tint} />
          </View>
          <Text selectable style={[Type.h1, { color: theme.text }]}>
            {job.title}
          </Text>
          <View style={styles.metaRow}>
            <JobStatusPill status={job.status} />
            <Text style={[Type.caption, { color: theme.textSecondary }]}>
              {categoryLabel(job.category)} · posted {timeAgo(job.created_at)}
            </Text>
          </View>
        </Animated.View>

        {/* ── Money on the line. The single most important fact on this
              screen once a job is live, so it leads and it is the only
              display-sized number. ─────────────────────────────────── */}
        {live && escrow ? (
          <View
            style={[
              styles.vault,
              { backgroundColor: theme.tint + '12', borderColor: theme.tint + '2E' },
            ]}>
            <View style={styles.vaultTop}>
              <Icon name="lock-closed" size={14} color={theme.tint} />
              <Text style={[Type.micro, { color: theme.tint }]}>HELD IN ESCROW</Text>
            </View>
            <MoneyText amount={held > 0 ? held : 0} style={[Type.display, { color: theme.text }]} />
            <Text style={[Type.caption, { color: theme.textSecondary }]}>
              of {''}
              <MoneyText
                amount={escrow.total}
                compact
                style={[Type.caption, { color: theme.textSecondary }]}
              />
              {''} agreed · released only when you approve
            </Text>
          </View>
        ) : null}

        {/* ── Milestones ─────────────────────────────────────────── */}
        {escrow ? (
          <View style={styles.section}>
            <Text style={[Type.h3, { color: theme.text }]}>Progress</Text>
            <Card>
              <EscrowTimeline job={job} escrow={escrow} role="client" />
            </Card>
          </View>
        ) : null}

        {/* ── Actions ────────────────────────────────────────────── */}
        {job.status === 'in_progress' || job.status === 'completed' || job.status === 'hiring' ? (
          <EscrowSection job={job} />
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
        {job.status === 'posted' || job.status === 'hiring' ? (
          <Link href={routes.jobQuotes(job.id)} asChild>
            <Button title="Review quotes" size="lg" variant="secondary" icon="document-text" />
          </Link>
        ) : null}

        {/* ── Details ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[Type.h3, { color: theme.text }]}>Details</Text>
          <Card>
            <Row label="Budget">
              {job.budget != null ? (
                <MoneyText amount={job.budget} style={Type.bodyMedium} />
              ) : (
                <Text style={[Type.body, { color: theme.textSecondary }]}>Open to quotes</Text>
              )}
            </Row>
            {job.location ? (
              <>
                <Divider />
                <Row label="Location">
                  <Text selectable style={[Type.bodyMedium, { color: theme.text }]}>
                    {job.location}
                  </Text>
                </Row>
              </>
            ) : null}
            {job.scheduled_for ? (
              <>
                <Divider />
                <Row label="Scheduled">
                  <Text style={[Type.bodyMedium, { color: theme.text }]}>
                    {formatDate(job.scheduled_for)}
                  </Text>
                </Row>
              </>
            ) : null}
          </Card>
        </View>

        {job.description ? (
          <View style={styles.section}>
            <Text style={[Type.h3, { color: theme.text }]}>Description</Text>
            <Text selectable style={[Type.body, { color: theme.textSecondary, lineHeight: 23 }]}>
              {job.description}
            </Text>
          </View>
        ) : null}

        {media && media.length > 0 ? (
          <View style={styles.section}>
            <Text style={[Type.h3, { color: theme.text }]}>Photos & Videos</Text>
            <MediaGallery media={media} />
          </View>
        ) : null}

        {/* ── Review ─────────────────────────────────────────────── */}
        {job.status === 'completed' && job.hired_provider_id && myReview ? (
          <View style={styles.section}>
            <Text style={[Type.h3, { color: theme.text }]}>Your review</Text>
            <Card>
              <RatingStars rating={myReview.rating} size={16} showValue={false} />
              {myReview.comment ? (
                <Text
                  selectable
                  style={[Type.body, { color: theme.textSecondary, marginTop: Spacing.two }]}>
                  {myReview.comment}
                </Text>
              ) : null}
            </Card>
          </View>
        ) : null}

        {/* ── Escape hatch. Deliberately last and quiet: it should be
              findable when something is wrong, not competing with the
              actions above. ──────────────────────────────────────── */}
        {(job.status === 'in_progress' || job.status === 'completed') && job.hired_provider_id ? (
          <Link href={routes.disputeJob(job.id)} asChild>
            <Button title="Report a problem" variant="ghost" icon="warning-outline" />
          </Link>
        ) : null}
      </Screen>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[Type.body, { color: theme.textSecondary }]}>{label}</Text>
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
  hero: { gap: Spacing.two },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  vault: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  vaultTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  section: { gap: Spacing.twoHalf },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  divider: { height: StyleSheet.hairlineWidth },
});
