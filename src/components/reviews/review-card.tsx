import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Card, RatingStars } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/date';
import type { ReviewWithReviewer } from '@/services/reviews';
import { useTheme } from '@/hooks/use-theme';

export function ReviewCard({ review }: { review: ReviewWithReviewer }) {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.header}>
        <Avatar uri={review.reviewer?.avatar_url} name={review.reviewer?.name} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]}>
            {review.reviewer?.name ?? 'Customer'}
          </Text>
          <Text style={[styles.date, { color: theme.textSecondary }]}>
            {formatDate(review.created_at)}
          </Text>
        </View>
        <RatingStars rating={review.rating} size={13} showValue={false} />
      </View>
      {review.comment ? (
        <Text selectable style={[styles.comment, { color: theme.textSecondary }]}>
          {review.comment}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { fontSize: 15, fontWeight: '600' },
  date: { fontSize: 13 },
  comment: { fontSize: 15, lineHeight: 21, marginTop: Spacing.two },
});
