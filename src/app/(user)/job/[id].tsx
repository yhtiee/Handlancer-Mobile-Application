import { StatusBar } from 'expo-status-bar';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { escrowAmounts, EscrowTape } from '@/components/escrow/escrow-tape';
import { EscrowSection } from '@/components/escrow/escrow-section';
import { EscrowTimeline } from '@/components/escrow/escrow-timeline';
import { MediaGallery } from '@/components/media/media-gallery';
import {
  Avatar,
  Button,
  formatMoney,
  GlassButton,
  GlobalLoader,
  Icon,
  MoneyText,
  PhotoHeader,
} from '@/components/ui';
import { Text } from '@/components/ui/text';
import { categoryLabel } from '@/constants/categories';
import { Layout, Radius, Spacing, Type } from '@/constants/theme';
import { useContentInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, timeAgo } from '@/lib/date';
import { jobNextStep, liveQuotes } from '@/lib/job-state';
import { categoryPhoto, providerImageFallback } from '@/lib/provider-images';
import { routes } from '@/lib/routes';
import { useStartConversation } from '@/queries/use-chat';
import { useJobDispute } from '@/queries/use-disputes';
import { useJob, useUpdateJobStatus } from '@/queries/use-jobs';
import { useJobMedia } from '@/queries/use-media';
import { useProvider } from '@/queries/use-providers';
import { useJobQuotes } from '@/queries/use-quotes';
import { useMyReviewForJob } from '@/queries/use-reviews';
import { useEscrow } from '@/queries/use-wallet';

/**
 * One job, told as where it stands. The first thing under the photo is the
 * next step — the same sentence the Jobs list shows — with the action that
 * takes it. Then the money as a tape, the person doing it, and the brief.
 */
export default function JobDetail() {
  const theme = useTheme();
  const router = useRouter();
  const bottom = useContentInset();
  const startChat = useStartConversation();
  const [chatError, setChatError] = useState<string | null>(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const { data: provider } = useProvider(job?.hired_provider_id ?? '');
  const { data: media } = useJobMedia(id);
  const { data: quotes } = useJobQuotes(id);
  const { data: myReview } = useMyReviewForJob(id);
  const { data: escrow } = useEscrow(id);
  const { data: dispute } = useJobDispute(id);
  const updateStatus = useUpdateJobStatus(id);

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

  /** Reuses the existing thread with this provider, or opens one. */
  async function messageProvider() {
    if (!job?.hired_provider_id) return;
    setChatError(null);
    try {
      const convo = await startChat.mutateAsync({ providerId: job.hired_provider_id, jobId: job.id });
      router.push(routes.chatThread('user', convo.id));
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'Could not open the chat.');
    }
  }

  const step = jobNextStep(job, escrow, quotes, provider?.name);
  const live = Boolean(escrow) && escrow!.status !== 'pending';
  const held = escrow ? escrowAmounts(escrow).held : 0;
  const first = provider?.name?.trim().split(' ')[0];
  const firstPhoto = media?.find((m) => m.kind === 'photo');
  // The person doing it; before anyone is hired, the client's own photo of the problem.
  const photo = provider
    ? (provider.avatar_url ?? providerImageFallback(provider))
    : (firstPhoto?.url ?? categoryPhoto(job.category ?? 'other'));
  const eyebrow = [categoryLabel(job.category), job.location].filter(Boolean).join(' · ');
  const pending = liveQuotes(quotes);
  // Money actions run here (their PIN and confirm sheets live in EscrowSection);
  // everything else links to the screen that does it.
  const escrowActs =
    (job.status === 'in_progress' || job.status === 'hiring' || job.status === 'posted') &&
    step.action?.href === routes.jobDetail(job.id);
  const facts = [
    job.budget != null ? `Budget ${formatMoney(job.budget)}` : 'Open to quotes',
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
          source={photo}
          contentPosition="top"
          heightRatio={0.36}
          eyebrow={eyebrow}
          controls={
            <GlassButton
              onPhoto
              icon="chevron-back"
              accessibilityLabel="Back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.userHome))}
            />
          }>
          <Text selectable style={[Type.serifTitle, styles.onPhoto]}>
            {job.title}
          </Text>
        </PhotoHeader>

        <View style={styles.body}>
          {/* ── Next step: where it stands, and the one thing to do ─── */}
          <View style={[styles.panel, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[Type.caption, { color: theme.textSecondary }]}>
              {step.lane === 'needs' ? 'Waiting on you' : step.lane === 'done' ? 'Done' : 'Right now'}
            </Text>
            <Text style={[Type.serifTitle, { color: job.status === 'disputed' ? theme.danger : theme.text }]}>
              {step.headline}
            </Text>
            {step.detail ? <Text style={[Type.body, { color: theme.textSecondary }]}>{step.detail}</Text> : null}

            {pending.length && !provider ? (
              <View style={styles.faces}>
                {pending.slice(0, 4).map((q, i) => (
                  <View
                    key={q.id}
                    style={[styles.face, { marginLeft: i ? -10 : 0, borderColor: theme.backgroundElement }]}>
                    <Avatar uri={q.provider?.avatar_url} name={q.provider?.name} size={32} />
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.actions}>
              {job.status === 'draft' ? (
                <Button
                  title="Post it"
                  size="lg"
                  loading={updateStatus.isPending}
                  onPress={() => updateStatus.mutate('posted')}
                />
              ) : escrowActs ? (
                <EscrowSection job={job} />
              ) : step.action ? (
                <Button
                  title={step.action.label}
                  size="lg"
                  variant={step.action.money ? 'primary' : 'secondary'}
                  style={step.action.money ? undefined : { backgroundColor: theme.background }}
                  onPress={() => router.push(step.action!.href)}
                />
              ) : job.status === 'in_progress' ? (
                // Nothing is due, but approving early is still the client's call.
                <EscrowSection job={job} />
              ) : null}
            </View>
          </View>

          {/* ── The money ──────────────────────────────────────────── */}
          {live && escrow ? (
            <View style={styles.section}>
              <Text style={[Type.h3, { color: theme.text }]}>The money</Text>
              <View>
                <MoneyText amount={held} style={[Type.amount, { color: theme.text }]} />
                <Text style={[Type.body, { color: theme.textSecondary }]}>
                  {held > 0 ? 'still in escrow, of ' : 'all paid out, of '}
                  <MoneyText amount={escrow.total} style={[Type.body, { color: theme.textSecondary }]} />
                  {' agreed'}
                </Text>
              </View>
              <EscrowTape escrow={escrow} style={{ marginTop: Spacing.two }} />
              <View style={{ marginTop: Spacing.two }}>
                <EscrowTimeline job={job} escrow={escrow} role="client" />
              </View>
            </View>
          ) : null}

          {/* ── Who's doing it ─────────────────────────────────────── */}
          {provider ? (
            <View style={styles.section}>
              <Text style={[Type.h3, { color: theme.text }]}>Who’s doing it</Text>
              <View style={styles.who}>
                <Pressable
                  style={styles.whoMain}
                  onPress={() => router.push(routes.providerProfile(provider.id))}>
                  <Avatar uri={provider.avatar_url} name={provider.name} size={52} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Type.title, { color: theme.text }]} numberOfLines={1}>
                      {provider.name ?? 'Your provider'}
                    </Text>
                    <Text style={[Type.caption, { color: theme.textSecondary }]} numberOfLines={1}>
                      {[provider.services?.[0], provider.rating > 0 ? `${provider.rating.toFixed(1)} rating` : 'New']
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${first ?? 'your provider'}`}
                  onPress={messageProvider}
                  disabled={startChat.isPending}
                  style={({ pressed }) => [
                    styles.msg,
                    {
                      backgroundColor: theme.backgroundElement,
                      opacity: pressed || startChat.isPending ? 0.7 : 1,
                    },
                  ]}>
                  <Icon name="chatbubble-outline" size={20} color={theme.text} />
                </Pressable>
              </View>
              {chatError ? (
                <Text selectable style={[Type.callout, { color: theme.danger }]}>
                  {chatError}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* ── The brief ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[Type.h3, { color: theme.text }]}>Your brief</Text>
            <Text style={[Type.caption, { color: theme.textSecondary }]}>{facts}</Text>
            {job.description ? (
              <Text selectable style={[Type.body, { color: theme.text, lineHeight: 23 }]}>
                {job.description}
              </Text>
            ) : null}
            {media && media.length > 0 ? (
              <View style={{ marginTop: Spacing.two }}>
                <MediaGallery media={media} />
              </View>
            ) : null}
          </View>

          {/* ── Your review ────────────────────────────────────────── */}
          {job.status === 'completed' && myReview ? (
            <View style={styles.section}>
              <Text style={[Type.h3, { color: theme.text }]}>What you said</Text>
              {myReview.comment ? (
                <Text selectable style={[styles.quote, { color: theme.text }]}>
                  “{myReview.comment}”
                </Text>
              ) : null}
              <Text style={[Type.caption, { color: theme.textSecondary }]}>{myReview.rating} of 5</Text>
            </View>
          ) : job.status === 'completed' && job.hired_provider_id ? (
            <Button
              title={`Review ${first ?? 'your provider'}`}
              variant="secondary"
              onPress={() => router.push(routes.reviewJob(job.id))}
            />
          ) : null}

          {/* ── The sad path: last and quiet while the job runs; once a
                dispute is open it is the only thing that can happen. ── */}
          {job.status === 'disputed' ? (
            <View style={[styles.panel, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.disputedHead}>
                <View style={[styles.dot, { backgroundColor: theme.danger }]} />
                <Text style={[Type.title, { color: theme.text, flex: 1 }]}>Dispute open</Text>
                {dispute?.reference ? (
                  <Text selectable style={[Type.caption, { color: theme.textSecondary }]}>
                    {dispute.reference}
                  </Text>
                ) : null}
              </View>
              <Text style={[Type.callout, { color: theme.textSecondary }]}>
                Everything still in escrow is frozen and {first ?? 'the provider'} has been told.
                Support settles it from here.
              </Text>
              <Button
                title="Contact support"
                variant="secondary"
                style={{ backgroundColor: theme.background }}
                onPress={() => router.push(routes.disputeJob(job.id))}
              />
            </View>
          ) : (job.status === 'in_progress' || job.status === 'completed') && job.hired_provider_id ? (
            <Button
              title="Something wrong? Open a dispute"
              variant="ghost"
              onPress={() => router.push(routes.disputeJob(job.id))}
            />
          ) : null}
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
  actions: { marginTop: Spacing.two, gap: Spacing.two },
  faces: { flexDirection: 'row', marginTop: Spacing.one },
  face: { borderWidth: 2, borderRadius: Radius.pill },
  section: { gap: Spacing.twoHalf },
  who: { flexDirection: 'row', alignItems: 'center', gap: Spacing.twoHalf },
  whoMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.twoHalf },
  msg: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quote: { ...Type.serifTitle, fontSize: 17, lineHeight: 24, fontStyle: 'italic' },
  disputedHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
