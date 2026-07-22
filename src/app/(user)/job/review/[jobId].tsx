import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RatingInput } from '@/components/reviews/rating-input';
import { Button } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useJob } from '@/queries/use-jobs';
import { useCreateReview } from '@/queries/use-reviews';
import { useTheme } from '@/hooks/use-theme';

export default function ReviewJob() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { data: job } = useJob(jobId);
  const createReview = useCreateReview();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (rating < 1) return setError('Tap a star to rate the work');
    if (!job?.hired_provider_id) return setError('No provider to review on this job');
    try {
      await createReview.mutateAsync({
        providerId: job.hired_provider_id,
        jobId,
        rating,
        comment: comment.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your review.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Leave a Review' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Text style={[styles.prompt, { color: theme.text }]}>How was the work?</Text>
        <RatingInput
          value={rating}
          onChange={(val) => {
            setRating(val);
            if (val >= 1) setError(null);
          }}
        />

        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Share details about your experience (optional)"
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[styles.textArea, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        {error ? (
          <Text selectable style={[styles.error, { color: theme.danger }]}>
            {error}
          </Text>
        ) : null}

        <Button
          title="Submit review"
          size="lg"
          loading={createReview.isPending}
          onPress={submit}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.five, gap: Spacing.four },
  prompt: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  textArea: {
    minHeight: 110,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  error: { fontSize: 14 },
});
