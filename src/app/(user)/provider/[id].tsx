import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaViewer } from '@/components/media/media-viewer';
import {
  Button,
  formatMoney,
  GlassButton,
  GlobalLoader,
  Icon,
  PhotoHeader,
  Tape,
} from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Layout, Radius, Scrim, Spacing, Type, TypeItalic } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { providerImageFallback } from '@/lib/provider-images';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useStartConversation } from '@/queries/use-chat';
import { useProviderMedia } from '@/queries/use-media';
import { useProvider } from '@/queries/use-providers';
import { useProviderReviews } from '@/queries/use-reviews';
import type { JobMedia, Profile } from '@/services/database.types';
import type { ReviewWithReviewer } from '@/services/reviews';

/** Room for the pinned dock above the safe area. */
const DOCK = 86;

const AVAILABILITY: Record<NonNullable<Profile['availability']>, { label: string; tone: 'on' | 'busy' | 'off' }> = {
  available: { label: 'Available now', tone: 'on' },
  on_call: { label: 'On call', tone: 'on' },
  busy: { label: 'Busy this week', tone: 'busy' },
  offline: { label: 'Not taking work', tone: 'off' },
};

/** One finished job: its before/after photos and what the client said. */
type Case = {
  jobId: string;
  media: JobMedia[];
  before?: JobMedia;
  after?: JobMedia;
  review?: ReviewWithReviewer;
  at: string;
};

/**
 * A provider, seen by a client deciding whether to ask them for a quote.
 *
 * The answer to "can they do my job?" is their finished work, so the middle of
 * the screen is a set of cases: each job's after photo, the before inset, and
 * that client's words. Every photo comes from a job paid through Handlancer,
 * which is a stronger claim than any portfolio. The escrow tape then answers
 * "is my money safe?", and the dock is the one action.
 */
export default function ProviderProfile() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile: me } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: provider, isLoading } = useProvider(id);
  const { data: media } = useProviderMedia(id);
  const { data: reviews } = useProviderReviews(id);
  const startChat = useStartConversation();
  const [viewing, setViewing] = useState<JobMedia[] | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  // Only ever real work and real reviews: invented ones would misrepresent a
  // real person to a client deciding whether to trust them with their home.
  const { cases, quietReviews } = useMemo(() => buildCases(media ?? [], reviews ?? []), [media, reviews]);

  if (isLoading || !provider) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={[Type.body, { color: theme.textSecondary }]}>Provider not found.</Text>
        )}
      </View>
    );
  }

  const first = provider.name?.trim().split(' ')[0] ?? 'them';
  const [given, ...rest] = (provider.name ?? 'Provider').trim().split(' ');
  const trade = provider.services?.[0];
  const years = provider.years_experience;
  const eyebrow = [
    trade,
    years ? `${years} ${years === 1 ? 'year' : 'years'}` : null,
    provider.business_name,
  ]
    .filter(Boolean)
    .join(' · ');
  const availability = provider.availability ? AVAILABILITY[provider.availability] : null;
  const km = distanceKm(me, provider);
  const reviewCount = reviews?.length ?? 0;
  const bio = provider.bio?.trim();
  const otherTrades = (provider.services ?? []).slice(1);

  async function message() {
    try {
      const convo = await startChat.mutateAsync({ providerId: provider!.id, jobId: null });
      router.push(routes.chatThread('user', convo.id));
    } catch {
      // The chat screen surfaces its own errors; a failed open just stays here.
    }
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: DOCK + insets.bottom + Spacing.four }}>
        {/* ── Who: the person, in their workshop ─────────────────────── */}
        <PhotoHeader
          source={provider.avatar_url ?? providerImageFallback(provider)}
          contentPosition="top"
          heightRatio={0.5}
          eyebrow={eyebrow || undefined}
          controls={
            <GlassButton
              onPhoto
              icon="chevron-back"
              accessibilityLabel="Back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.userHome))}
            />
          }>
          <Text style={[Type.serif, styles.onPhoto]} numberOfLines={2}>
            {given}
            {rest.length ? <Text style={TypeItalic}> {rest.join(' ')}</Text> : null}
          </Text>
          {availability ? (
            <View style={styles.available}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      availability.tone === 'on'
                        ? '#46C77E'
                        : availability.tone === 'busy'
                          ? '#E2A03F'
                          : 'rgba(255,255,255,0.5)',
                  },
                ]}
              />
              <Text style={styles.availableText}>{availability.label}</Text>
            </View>
          ) : null}
        </PhotoHeader>

        <View style={styles.body}>
          {/* ── The facts, said once, as a sentence ─────────────────── */}
          <Text style={[styles.facts, { color: theme.textSecondary }]}>
            {reviewCount ? (
              <>
                <Text style={[styles.factStrong, { color: theme.text }]}>{provider.rating.toFixed(1)}</Text>
                {` from ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`}
              </>
            ) : (
              <Text style={[styles.factStrong, { color: theme.text }]}>New on Handlancer</Text>
            )}
            {km != null ? (
              <>
                {' · '}
                <Text style={[styles.factStrong, { color: theme.text }]}>
                  {km < 1 ? 'Under 1 km' : `${km.toFixed(1)} km`}
                </Text>
                {' from you'}
              </>
            ) : provider.location ? (
              ` · ${provider.location}`
            ) : null}
            {provider.is_verified ? ' · ID verified' : null}
            {' · '}
            {provider.hourly_rate ? (
              <>
                <Text style={[styles.factStrong, { color: theme.text }]}>
                  From {formatMoney(provider.hourly_rate)}
                </Text>
                {' an hour'}
              </>
            ) : (
              'priced by quote'
            )}
          </Text>

          {/* ── What: the work itself, before and after ─────────────── */}
          <View style={styles.section}>
            <Text style={[Type.serifTitle, styles.padded, { color: theme.text }]}>
              Their work, <Text style={TypeItalic}>before and after.</Text>
            </Text>
            {cases.length ? (
              <CaseStrip cases={cases} onOpen={setViewing} />
            ) : (
              <View style={[styles.noWork, { backgroundColor: theme.accent }]}>
                <Text style={[Type.serifTitle, { color: '#FBFCFD', fontSize: 22, lineHeight: 28 }]}>
                  <Text style={TypeItalic}>{trade ?? 'Their trade'}</Text>
                </Text>
                <Text style={[Type.callout, { color: 'rgba(251,252,253,0.86)' }]}>
                  No job photos yet. {first}’s before and after photos appear here as they finish
                  jobs on Handlancer.
                </Text>
              </View>
            )}
          </View>

          {/* ── Safe: how the money moves, as the tape ─────────────── */}
          <View style={[styles.section, styles.padded]}>
            <Text style={[Type.h3, { color: theme.text }]}>How you’d pay {first}</Text>
            <Text style={[Type.body, { color: theme.textSecondary }]}>
              You pay into escrow, not to {first}. They’re paid in stages, each one when you
              approve it.
            </Text>
            <Tape
              progress={0.35}
              stops={[0.35]}
              size="inline"
              style={{ marginTop: Spacing.two }}
              marks={[
                { at: 0.35, value: 'Materials', label: 'when they buy' },
                { at: 1, value: 'The rest', label: 'when you approve' },
              ]}
            />
          </View>

          {/* ── About ─────────────────────────────────────────────── */}
          {bio || otherTrades.length ? (
            <View style={[styles.section, styles.padded]}>
              <Text style={[Type.h3, { color: theme.text }]}>About {first}</Text>
              {bio ? (
                <>
                  <Text
                    style={[Type.body, { color: theme.textSecondary, lineHeight: 23 }]}
                    numberOfLines={bioExpanded ? undefined : 4}>
                    {bio}
                  </Text>
                  {bio.length > 160 ? (
                    <Pressable hitSlop={8} onPress={() => setBioExpanded((v) => !v)}>
                      <Text style={[Type.bodyMedium, { color: theme.text }]}>
                        {bioExpanded ? 'Show less' : 'Read more'}
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}
              {otherTrades.length ? (
                <Text style={[Type.caption, { color: theme.textSecondary }]}>
                  Also does <Text style={{ color: theme.text, fontWeight: '600' }}>{otherTrades.join(' · ')}</Text>
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* ── Reviews from jobs without photos ─────────────────────── */}
          {quietReviews.length ? (
            <View style={[styles.section, styles.padded]}>
              <Text style={[Type.h3, { color: theme.text }]}>More from clients</Text>
              {quietReviews.slice(0, 4).map((r) => (
                <ReviewQuote key={r.id} review={r} />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ── The one action, in the thumb zone ─────────────────────── */}
      <LinearGradient
        pointerEvents="box-none"
        colors={[theme.background + '00', theme.background, theme.background]}
        locations={[0, 0.3, 1]}
        style={[styles.dock, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Message ${first}`}
          disabled={startChat.isPending}
          onPress={message}
          style={({ pressed }) => [
            styles.msg,
            { backgroundColor: theme.backgroundElement, opacity: pressed || startChat.isPending ? 0.7 : 1 },
          ]}>
          <Icon name="chatbubble-outline" size={22} color={theme.text} />
        </Pressable>
        <Button
          title={`Ask ${first} for a quote`}
          size="lg"
          style={{ flex: 1 }}
          onPress={() => router.push(routes.postDirectJob(provider.id))}
        />
      </LinearGradient>

      <MediaViewer
        media={viewing ?? []}
        startIndex={0}
        visible={Boolean(viewing)}
        onClose={() => setViewing(null)}
      />
    </View>
  );
}

/** Horizontal, paged strip of finished jobs; the next case peeks in. */
function CaseStrip({ cases, onOpen }: { cases: Case[]; onOpen: (media: JobMedia[]) => void }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.round((width - Layout.gutter * 2) * 0.86);
  const gap = Spacing.twoHalf;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + gap}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: Layout.gutter, gap }}>
      {cases.map((c) => (
        <CaseCard key={c.jobId} item={c} width={cardWidth} onOpen={() => onOpen(c.media)} />
      ))}
    </ScrollView>
  );
}

function CaseCard({ item, width, onOpen }: { item: Case; width: number; onOpen: () => void }) {
  const theme = useTheme();
  const hero = item.after ?? item.before;
  const inset = item.after && item.before ? item.before : null;
  const height = Math.round(width * 0.82);
  const when = monthYear(item.review?.created_at ?? item.at);

  return (
    <View style={{ width, gap: Spacing.twoHalf }}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="Open the photos from this job"
        onPress={onOpen}
        style={[styles.caseImage, { height, backgroundColor: theme.backgroundElement }]}>
        {hero ? (
          <Image source={hero.url} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : null}
        <LinearGradient
          pointerEvents="none"
          colors={[`rgba(${Scrim},0)`, `rgba(${Scrim},0.6)`]}
          style={styles.caseScrim}
        />
        <Text style={styles.caseTag}>{item.after ? 'After' : 'Before'}</Text>
        {inset ? (
          <View style={[styles.inset, { borderColor: theme.background }]}>
            <Image source={inset.url} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={styles.insetTag}>
              <Text style={styles.insetTagText}>Before</Text>
            </View>
          </View>
        ) : null}
        {item.media.length > 2 ? (
          <View style={styles.count}>
            <Icon name="images-outline" size={13} color="#FFFFFF" />
            <Text style={styles.countText}>{item.media.length}</Text>
          </View>
        ) : null}
      </Pressable>
      {item.review?.comment ? (
        <Text numberOfLines={4} style={[styles.quote, { color: theme.text }]}>
          “{item.review.comment}”
        </Text>
      ) : null}
      <Text style={[Type.caption, { color: theme.textSecondary }]}>
        {item.review
          ? [item.review.reviewer?.name?.split(' ')[0] ?? 'Client', `${item.review.rating} of 5`, when]
              .filter(Boolean)
              .join(' · ')
          : `Finished ${when}`}
      </Text>
    </View>
  );
}

function ReviewQuote({ review }: { review: ReviewWithReviewer }) {
  const theme = useTheme();
  return (
    <View style={[styles.review, { borderTopColor: theme.border }]}>
      {review.comment ? (
        <Text style={[styles.quote, { color: theme.text }]}>“{review.comment}”</Text>
      ) : null}
      <Text style={[Type.caption, { color: theme.textSecondary }]}>
        {[review.reviewer?.name?.split(' ')[0] ?? 'Client', `${review.rating} of 5`, monthYear(review.created_at)].join(
          ' · ',
        )}
      </Text>
    </View>
  );
}

/** Group the provider's job photos into one case per job, newest first, joined to that job's review. */
function buildCases(media: JobMedia[], reviews: ReviewWithReviewer[]) {
  const byJob = new Map<string, JobMedia[]>();
  for (const m of media) {
    const list = byJob.get(m.job_id) ?? [];
    list.push(m);
    byJob.set(m.job_id, list);
  }
  const cases: Case[] = [];
  for (const [jobId, list] of byJob) {
    const photos = list.filter((m) => m.kind === 'photo');
    if (!photos.length) continue;
    cases.push({
      jobId,
      media: list,
      before: photos.find((m) => m.phase === 'before'),
      after: photos.find((m) => m.phase === 'after'),
      review: reviews.find((r) => r.job_id === jobId),
      at: list.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at,
    });
  }
  // Jobs with both halves of the story first, then newest.
  cases.sort((a, b) => Number(!!b.after && !!b.before) - Number(!!a.after && !!a.before) || b.at.localeCompare(a.at));
  const shown = new Set(cases.map((c) => c.jobId));
  const quietReviews = reviews.filter((r) => !shown.has(r.job_id) && r.comment?.trim());
  return { cases, quietReviews };
}

/** Straight-line distance between two profiles, when both have coordinates. */
function distanceKm(a?: Profile | null, b?: Profile | null): number | null {
  if (a?.latitude == null || a.longitude == null || b?.latitude == null || b.longitude == null) return null;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function monthYear(iso: string) {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString(undefined, sameYear ? { month: 'long' } : { month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  onPhoto: { color: '#FFFFFF' },
  available: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two - 2, marginTop: Spacing.twoHalf },
  dot: { width: 8, height: 8, borderRadius: 4 },
  availableText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  body: { paddingTop: Spacing.threeHalf, gap: Spacing.five },
  padded: { paddingHorizontal: Layout.gutter },
  facts: { ...Type.body, fontSize: 17, lineHeight: 26, paddingHorizontal: Layout.gutter },
  factStrong: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  section: { gap: Spacing.twoHalf },
  noWork: {
    marginHorizontal: Layout.gutter,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  caseImage: { borderRadius: Radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  caseScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' },
  caseTag: {
    position: 'absolute',
    right: Spacing.twoHalf,
    bottom: Spacing.twoHalf,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  inset: {
    position: 'absolute',
    left: Spacing.twoHalf,
    bottom: Spacing.twoHalf,
    width: '34%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 2,
    overflow: 'hidden',
  },
  insetTag: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 3,
    backgroundColor: `rgba(${Scrim},0.6)`,
    alignItems: 'center',
  },
  insetTagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  count: {
    position: 'absolute',
    top: Spacing.twoHalf,
    right: Spacing.twoHalf,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: `rgba(${Scrim},0.6)`,
  },
  countText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  quote: { ...Type.serifTitle, fontSize: 17, lineHeight: 24, fontStyle: 'italic' },
  review: { gap: Spacing.one + 2, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.five,
  },
  msg: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
});
