import { StatusBar } from 'expo-status-bar';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ProviderDisputeBanner } from '@/components/disputes/provider-dispute-banner';
import { escrowAmounts, EscrowTape } from '@/components/escrow/escrow-tape';
import { EscrowTimeline } from '@/components/escrow/escrow-timeline';
import { ProviderMilestones } from '@/components/escrow/provider-milestones';
import { ProofUploader } from '@/components/media/proof-uploader';
import { Avatar, formatMoney, GlassButton, GlobalLoader, MoneyText, PhotoHeader } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { categoryLabel } from '@/constants/categories';
import { Layout, Radius, Spacing, Type } from '@/constants/theme';
import { useContentInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, timeAgo } from '@/lib/date';
import { providerNextStep } from '@/lib/job-state';
import { categoryPhoto } from '@/lib/provider-images';
import { routes } from '@/lib/routes';
import { useJob } from '@/queries/use-jobs';
import { useJobMedia } from '@/queries/use-media';
import { useEscrow } from '@/queries/use-wallet';

/**
 * A hired job, from the provider's side. Under the photo of the job is the
 * next step — the same sentence as the Jobs list — with the request that
 * moves it on. Then the proof photos (the client pays on them), the pay as a
 * tape, the client and the brief.
 */
export default function ProviderJobDetail() {
  const theme = useTheme();
  const router = useRouter();
  const bottom = useContentInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const { data: media } = useJobMedia(id);
  const { data: escrow } = useEscrow(id);

  if (isLoading || !job) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={[Type.body, { color: theme.textSecondary }]}>Job not found.</Text>
        )}
      </View>
    );
  }

  const client = job.owner;
  const clientFirst = client?.name?.trim().split(' ')[0];
  const step = providerNextStep(job, escrow, client?.name);
  const live = Boolean(escrow) && escrow!.status !== 'pending';
  const { held, released } = escrow ? escrowAmounts(escrow) : { held: 0, released: 0 };
  const firstPhoto = media?.find((m) => m.kind === 'photo');
  const eyebrow = [categoryLabel(job.category), job.location].filter(Boolean).join(' · ');
  const facts = [
    job.budget != null ? `Client budget ${formatMoney(job.budget)}` : null,
    job.scheduled_for ? formatDate(job.scheduled_for) : null,
    `posted ${timeAgo(job.created_at)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottom }}>
        <PhotoHeader
          source={firstPhoto?.url ?? categoryPhoto(job.category ?? 'other')}
          contentPosition="top"
          heightRatio={0.34}
          eyebrow={eyebrow}
          controls={
            <GlassButton
              onPhoto
              icon="chevron-back"
              accessibilityLabel="Back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.providerFindWork))}
            />
          }>
          <Text selectable style={[Type.serifTitle, styles.onPhoto]}>
            {job.title}
          </Text>
        </PhotoHeader>

        <View style={styles.body}>
          {/* ── Next step ──────────────────────────────────────────── */}
          {job.status === 'disputed' ? (
            <ProviderDisputeBanner job={job} />
          ) : (
            <View style={[styles.panel, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[Type.caption, { color: theme.textSecondary }]}>
                {step.lane === 'yours'
                  ? 'Your move'
                  : step.lane === 'done'
                    ? 'Done'
                    : `Waiting on ${clientFirst ?? 'the client'}`}
              </Text>
              <Text style={[Type.serifTitle, { color: theme.text }]}>{step.headline}</Text>
              {step.detail ? <Text style={[Type.body, { color: theme.textSecondary }]}>{step.detail}</Text> : null}
              {job.status === 'completed' ? (
                <Text style={[Type.body, { color: theme.textSecondary }]}>The money is in your wallet.</Text>
              ) : null}
              {job.status === 'in_progress' ? (
                <View style={styles.actions}>
                  <ProviderMilestones job={job} />
                </View>
              ) : null}
            </View>
          )}

          {/* ── Proof: the client pays on these, so they come before the money ── */}
          {job.status === 'in_progress' || (media && media.length) ? (
            <View style={styles.section}>
              <Text style={[Type.h3, { color: theme.text }]}>Your photos</Text>
              <ProofUploader jobId={job.id} media={media ?? []} />
            </View>
          ) : null}

          {/* ── Your pay ───────────────────────────────────────────── */}
          {live && escrow ? (
            <View style={styles.section}>
              <Text style={[Type.h3, { color: theme.text }]}>Your pay</Text>
              <View>
                <MoneyText amount={held} style={[Type.amount, { color: theme.text }]} />
                <Text style={[Type.body, { color: theme.textSecondary }]}>
                  {held > 0 ? 'still to come, of ' : 'all paid, of '}
                  <MoneyText amount={escrow.total} style={[Type.body, { color: theme.textSecondary }]} />
                  {' agreed'}
                  {released > 0 && held > 0 ? ` · ${formatMoney(released)} already in your wallet` : ''}
                </Text>
              </View>
              <EscrowTape escrow={escrow} style={{ marginTop: Spacing.two }} />
              <View style={{ marginTop: Spacing.two }}>
                <EscrowTimeline job={job} escrow={escrow} role="provider" />
              </View>
            </View>
          ) : null}

          {/* ── The client ─────────────────────────────────────────── */}
          {client ? (
            <View style={styles.section}>
              <Text style={[Type.h3, { color: theme.text }]}>The client</Text>
              <View style={styles.who}>
                <Avatar uri={client.avatar_url} name={client.name} size={52} />
                <View style={{ flex: 1 }}>
                  <Text style={[Type.title, { color: theme.text }]} numberOfLines={1}>
                    {client.name ?? 'Handlancer client'}
                  </Text>
                  <Text style={[Type.caption, { color: theme.textSecondary }]} numberOfLines={1}>
                    {job.location ?? client.location ?? 'Location on request'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* ── The brief ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[Type.h3, { color: theme.text }]}>What they need</Text>
            <Text style={[Type.caption, { color: theme.textSecondary }]}>{facts}</Text>
            {job.description ? (
              <Text selectable style={[Type.body, { color: theme.text, lineHeight: 23 }]}>
                {job.description}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  onPhoto: { color: '#FFFFFF' },
  body: { paddingHorizontal: Layout.gutter, paddingTop: Spacing.threeHalf, gap: Spacing.five },
  panel: { borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.threeHalf, gap: Spacing.two },
  actions: { marginTop: Spacing.two },
  section: { gap: Spacing.twoHalf },
  who: { flexDirection: 'row', alignItems: 'center', gap: Spacing.twoHalf },
});
