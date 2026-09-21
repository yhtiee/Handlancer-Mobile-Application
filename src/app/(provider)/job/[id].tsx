import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ProviderDisputeBanner } from '@/components/disputes/provider-dispute-banner';
import { EscrowTimeline } from '@/components/escrow/escrow-timeline';
import { ProviderMilestones } from '@/components/escrow/provider-milestones';
import { ProofUploader } from '@/components/media/proof-uploader';
import {
  Card,
  GlobalLoader,
  Icon,
  JobStatusPill,
  MoneyText,
  Screen,
} from '@/components/ui';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { Radius, Spacing, Type } from '@/constants/theme';
import { formatDate, timeAgo } from '@/lib/date';
import { useJob } from '@/queries/use-jobs';
import { useJobMedia } from '@/queries/use-media';
import { useEscrow } from '@/queries/use-wallet';
import { useTheme } from '@/hooks/use-theme';

export default function ProviderJobDetail() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const { data: media } = useJobMedia(id);
  const { data: escrow } = useEscrow(id);

  if (isLoading || !job) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: '' }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={[Type.body, { color: theme.textSecondary }]}>Job not found.</Text>
        )}
      </View>
    );
  }

  const live = Boolean(escrow) && escrow!.status !== 'pending';
  // What the provider still stands to earn on this job.
  const outstanding = !escrow
    ? 0
    : escrow.workmanship_released
      ? 0
      : escrow.total - (escrow.materials_released ? escrow.materials_amount : 0);
  const earned = !escrow
    ? 0
    : (escrow.materials_released ? escrow.materials_amount : 0) +
      (escrow.workmanship_released ? escrow.total - (escrow.materials_released ? escrow.materials_amount : 0) : 0);

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
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
              {categoryLabel(job.category)} · hired {timeAgo(job.created_at)}
            </Text>
          </View>
        </Animated.View>

        {/* ── Ahead of the vault, because it changes what the vault means:
              that money is still there, but it is no longer simply waiting
              for the client to approve. ──────────────────────────── */}
        {job.status === 'disputed' ? <ProviderDisputeBanner job={job} /> : null}

        {/* ── The provider's version of the vault: what is secured for
              them, which is the reassurance that matters before they
              spend their own money on materials. ─────────────────── */}
        {live && escrow ? (
          <View
            style={[
              styles.vault,
              { backgroundColor: theme.tint + '12', borderColor: theme.tint + '2E' },
            ]}>
            <View style={styles.vaultTop}>
              <Icon
                name={job.status === 'disputed' ? 'lock-closed' : 'shield-checkmark'}
                size={14}
                color={theme.tint}
              />
              <Text style={[Type.micro, { color: theme.tint }]}>
                {job.status === 'disputed' ? 'FROZEN PENDING DISPUTE' : 'SECURED FOR YOU'}
              </Text>
            </View>
            <MoneyText
              amount={outstanding}
              style={[Type.display, { color: theme.text }]}
            />
            <Text style={[Type.caption, { color: theme.textSecondary }]}>
              {job.status === 'disputed' ? (
                'Held until support settles the dispute — neither side can move it'
              ) : earned > 0 ? (
                <>
                  <MoneyText
                    amount={earned}
                    compact
                    style={[Type.caption, { color: theme.textSecondary }]}
                  />
                  {' already paid to your wallet'}
                </>
              ) : (
                'The client has funded escrow — you are covered for this job'
              )}
            </Text>
          </View>
        ) : null}

        {/* ── Milestones ─────────────────────────────────────────── */}
        {escrow ? (
          <View style={styles.section}>
            <Text style={[Type.h3, { color: theme.text }]}>Progress</Text>
            <Card>
              <EscrowTimeline job={job} escrow={escrow} role="provider" />
            </Card>
          </View>
        ) : null}

        {/* ── Actions ────────────────────────────────────────────── */}
        {job.status === 'in_progress' ? <ProviderMilestones job={job} /> : null}

        {/* ── Job info ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[Type.h3, { color: theme.text }]}>Details</Text>
          <Card>
            {job.budget != null ? (
              <Row label="Client budget">
                <MoneyText amount={job.budget} style={Type.bodyMedium} />
              </Row>
            ) : null}
            {job.location ? (
              <>
                {job.budget != null ? <Divider /> : null}
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
            <Text style={[Type.h3, { color: theme.text }]}>What the client needs</Text>
            <Text selectable style={[Type.body, { color: theme.textSecondary, lineHeight: 23 }]}>
              {job.description}
            </Text>
          </View>
        ) : null}

        {/* ── Proof of work. Sits directly above "mark complete" in the
              flow, because the client reviews these photos to decide. ── */}
        <ProofUploader jobId={job.id} media={media ?? []} />

        {job.status === 'completed' ? (
          <View
            style={[
              styles.done,
              { backgroundColor: theme.success + '14', borderColor: theme.success + '33' },
            ]}>
            <Icon name="checkmark-circle" size={20} color={theme.success} />
            <Text style={[Type.bodyMedium, { color: theme.success, flex: 1 }]}>
              Job complete — payment released to your wallet.
            </Text>
          </View>
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
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
