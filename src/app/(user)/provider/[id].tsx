import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProviderGallery } from '@/components/providers/provider-gallery';
import { Avatar, Button, GlobalLoader, Icon, RatingStars } from '@/components/ui';
import { formatMoney } from '@/components/ui/money-text';
import { Elevation, Radius, Spacing, Type } from '@/constants/theme';
import { providerImageFallback } from '@/lib/provider-images';
import { routes } from '@/lib/routes';
import { useProviderMedia } from '@/queries/use-media';
import { useProvider } from '@/queries/use-providers';
import { useProviderReviews } from '@/queries/use-reviews';
import { useTheme } from '@/hooks/use-theme';

export default function ProviderProfile() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: provider, isLoading } = useProvider(id);
  const { data: media } = useProviderMedia(id);
  const { data: reviews } = useProviderReviews(id);
  const [bioExpanded, setBioExpanded] = useState(false);

  if (isLoading || !provider) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={{ color: theme.textSecondary }}>Provider not found.</Text>
        )}
      </View>
    );
  }

  const fallback = providerImageFallback(provider);
  const photos = (media ?? []).filter((m) => m.kind === 'photo').map((m) => m.url);
  const galleryImages = photos.length ? photos : [fallback];
  const avatarUri = provider.avatar_url ?? fallback;

  const primarySkill = provider.services?.[0] ?? 'Service Provider';
  const years = provider.years_experience;
  const subtitle = years
    ? `${primarySkill} · ${years} year${years === 1 ? '' : 's'} Experience`
    : primarySkill;

  const bio = provider.bio?.trim();

  // Only ever real reviews. Showing invented ones would misrepresent a real
  // person to a customer deciding whether to trust them with their home.
  const displayReviews = (reviews ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? '',
    reviewerName: r.reviewer?.name ?? 'Customer',
    reviewerAvatar: r.reviewer?.avatar_url ?? null,
  }));
  const featured = displayReviews[0];
  const firstName = provider.name?.split(' ')[0] ?? 'provider';

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 132 }}>
        <ProviderGallery images={galleryImages} avatarUri={avatarUri} name={provider.name} />

        <View style={styles.body}>
          {/* Name + rating */}
          <View style={styles.titleRow}>
            <Text style={[Type.h2, styles.name, { color: theme.text }]} numberOfLines={1}>
              {provider.name ?? 'Provider'}
            </Text>
            {displayReviews.length ? (
              <View style={styles.rating}>
                <Icon name="star" size={15} color={theme.warning} />
                <Text style={[styles.ratingValue, { color: theme.text }]}>
                  {provider.rating ? provider.rating.toFixed(1) : '—'}
                </Text>
                <Text style={[styles.ratingCount, { color: theme.tint }]}>
                  ({displayReviews.length})
                </Text>
              </View>
            ) : (
              <View style={[styles.chip, { backgroundColor: theme.tint + '14' }]}>
                <Text style={[styles.chipText, { color: theme.tint }]}>New</Text>
              </View>
            )}
          </View>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>

          {/* About me — omitted entirely rather than filled with invented copy. */}
          {bio ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>About me</Text>
              <Text
                style={[styles.bio, { color: theme.textSecondary }]}
                numberOfLines={bioExpanded ? undefined : 3}>
                {bio}
              </Text>
              {bio.length > 120 ? (
                <Pressable hitSlop={6} onPress={() => setBioExpanded((v) => !v)}>
                  <Text style={[styles.readMore, { color: theme.tint }]}>
                    {bioExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Skills */}
          {provider.services?.length ? (
            <View style={styles.skills}>
              {provider.services.map((s) => (
                <View key={s} style={[styles.chip, { backgroundColor: theme.tint + '14' }]}>
                  <Text style={[styles.chipText, { color: theme.tint }]}>{s}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Reviews. Absent until this provider has actually earned one. */}
          {!featured ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Reviews</Text>
              <Text style={[styles.bio, { color: theme.textSecondary }]}>
                No reviews yet — {firstName} is new to HandLancer. Every job is covered by
                escrow, so your payment is only released once you approve the work.
              </Text>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.reviewHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Review</Text>
                {displayReviews.length > 1 ? (
                  <Text style={[styles.seeAll, { color: theme.textSecondary }]}>
                    {displayReviews.length} total
                  </Text>
                ) : null}
              </View>

              <View style={[styles.reviewCard, { backgroundColor: theme.backgroundElement }]}>
                <RatingStars rating={featured.rating} size={15} showValue={false} />
                {featured.comment ? (
                  <Text style={[styles.reviewText, { color: theme.text }]}>
                    &ldquo;{featured.comment}&rdquo;
                  </Text>
                ) : null}
                <View style={styles.reviewer}>
                  <Avatar uri={featured.reviewerAvatar} name={featured.reviewerName} size={24} />
                  <Text style={[styles.reviewerName, { color: theme.textSecondary }]}>
                    {featured.reviewerName}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky hire bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.two,
          },
        ]}>
        <View style={styles.priceBlock}>
          <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Pricing</Text>
          <Text style={[styles.priceValue, { color: theme.text }]}>Via Negotiation</Text>
        </View>
        <Link href={routes.postDirectJob(provider.id)} asChild>
          <Button title={`Hire ${firstName}`} icon="briefcase" style={styles.hireBtn} />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { flex: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },
  ratingValue: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  ratingCount: { fontSize: 14, fontWeight: '700' },
  subtitle: { ...Type.callout, marginTop: -Spacing.two },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  bio: { fontSize: 15, lineHeight: 22 },
  readMore: { fontSize: 14, fontWeight: '700' },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  reviewCard: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  reviewText: { fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  reviewer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  reviewerName: { fontSize: 13, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    boxShadow: Elevation.lg,
  },
  priceBlock: { gap: 2 },
  priceLabel: { fontSize: 12, fontWeight: '600' },
  priceValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  priceUnit: { fontSize: 13, fontWeight: '600' },
  hireBtn: { flex: 1 },
});
