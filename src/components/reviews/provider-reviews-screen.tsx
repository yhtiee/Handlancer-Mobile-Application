import { Stack } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar, Card, EmptyState, GlobalLoader, RatingStars, ScreenView } from '@/components/ui';
import { Layout, Radius, Spacing, Type } from '@/constants/theme';
import { timeAgo } from '@/lib/date';
import { useAuth } from '@/providers/auth-provider';
import { useProviderReviews } from '@/queries/use-reviews';
import type { ReviewWithReviewer } from '@/services/reviews';
import { useContentInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';

/** Every review a provider has received, newest first, with a rating breakdown. */
export function ProviderReviewsScreen() {
  const bottomInset = useContentInset();
  const { session } = useAuth();
  const providerId = session?.user.id ?? '';
  const { data: reviews, isLoading, refetch, isRefetching } = useProviderReviews(providerId);

  const count = reviews?.length ?? 0;
  const average = count
    ? reviews!.reduce((sum, r) => sum + r.rating, 0) / count
    : 0;

  return (
    <ScreenView>
      <Stack.Screen options={{ title: 'My Reviews' }} />
      {isLoading ? (
        <GlobalLoader backgroundColor="transparent" />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Layout.gutter,
            paddingTop: Layout.headerGap,
            paddingBottom: bottomInset,
            gap: Layout.listGap,
          }}
          ListHeaderComponent={
            count ? (
              <Summary reviews={reviews!} average={average} count={count} />
            ) : null
          }
          renderItem={({ item, index }) => <ReviewCard review={item} index={index} />}
          ListEmptyComponent={
            <EmptyState
              icon="star-outline"
              title="No reviews yet"
              description="Once you complete jobs, the clients you work with can rate you here. A strong rating helps you win more work."
            />
          }
        />
      )}
    </ScreenView>
  );
}

/**
 * Average plus a 5→1 distribution. The bars matter more than the average alone:
 * a 4.5 from twenty reviews reads very differently to a 4.5 from two.
 */
function Summary({
  reviews,
  average,
  count,
}: {
  reviews: ReviewWithReviewer[];
  average: number;
  count: number;
}) {
  const theme = useTheme();
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <Card style={styles.summary}>
      <View style={styles.summaryLeft}>
        <Text style={[Type.display, { color: theme.text }]}>{average.toFixed(1)}</Text>
        <RatingStars rating={average} size={14} showValue={false} />
        <Text style={[Type.caption, { color: theme.textSecondary }]}>
          {count} review{count === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.bars}>
        {buckets.map(({ star, n }) => (
          <View key={star} style={styles.barRow}>
            <Text style={[Type.micro, styles.barStar, { color: theme.textSecondary }]}>
              {star}
            </Text>
            <View style={[styles.barTrack, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: theme.warning,
                    // Guard the divide: count is non-zero here, but width must
                    // still be a number when a bucket is empty.
                    width: `${count ? (n / count) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
            <Text style={[Type.micro, styles.barCount, { color: theme.textSecondary }]}>
              {n}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function ReviewCard({ review, index }: { review: ReviewWithReviewer; index: number }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 50).springify().damping(18)}>
      <Card>
        <View style={styles.reviewHead}>
          <Avatar uri={review.reviewer?.avatar_url} name={review.reviewer?.name} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[Type.bodyMedium, { color: theme.text }]}>
              {review.reviewer?.name ?? 'A client'}
            </Text>
            <Text style={[Type.caption, { color: theme.textSecondary }]}>
              {timeAgo(review.created_at)}
            </Text>
          </View>
          <RatingStars rating={review.rating} size={13} showValue={false} />
        </View>

        {review.comment ? (
          <Text
            selectable
            style={[Type.body, { color: theme.textSecondary, marginTop: Spacing.twoHalf }]}>
            {review.comment}
          </Text>
        ) : null}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: Spacing.four, alignItems: 'center' },
  summaryLeft: { alignItems: 'center', gap: Spacing.one, minWidth: 92 },
  bars: { flex: 1, gap: Spacing.one },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  barStar: { width: 8, textAlign: 'right' },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: Radius.pill },
  barCount: { width: 16, textAlign: 'right' },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.twoHalf },
});
