import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RatingInput } from '@/components/reviews/rating-input';
import {
  Button,
  Card,
  formatMoney,
  MoneyText,
  RatingStars,
  SuccessModal,
} from '@/components/ui';
import { PinConfirmModal } from '@/components/wallet/pin-confirm-modal';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useJob } from '@/queries/use-jobs';
import { useCreateReview } from '@/queries/use-reviews';
import { useEscrow, useReviewAndRelease } from '@/queries/use-wallet';
import { useTheme } from '@/hooks/use-theme';

export default function ReviewJob() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { data: job } = useJob(jobId);
  const { data: escrow } = useEscrow(jobId);
  const createReview = useCreateReview();
  const reviewAndRelease = useReviewAndRelease(jobId);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [released, setReleased] = useState(false);

  // Money still held means this is the approve-and-pay step. On an already
  // completed job the same screen is just a plain review.
  const releasing = Boolean(escrow) && !escrow!.workmanship_released;
  const amount = escrow
    ? escrow.total - (escrow.materials_released ? escrow.materials_amount : 0)
    : 0;
  const pending = createReview.isPending || reviewAndRelease.isPending;

  /** Validates, then either opens the release confirmation or posts a plain review. */
  async function submit() {
    setError(null);
    if (rating < 1) return setError('Tap a star to rate the work');
    if (!job?.hired_provider_id) return setError('No provider to review on this job');
    // Disputed money is support's to settle. `review_and_release` refuses this
    // too (0020) — this is only so the user finds out before typing a review,
    // rather than from a Postgres error after.
    if (job.status === 'disputed') {
      return setError(
        'This job is under dispute. Support settles the escrow — it cannot be released here.',
      );
    }

    // Money is about to move — confirm the amount before it goes.
    if (releasing) return setConfirming(true);

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

  /** The transfer PIN comes from the modal; it is only ever forwarded to the RPC. */
  async function confirmRelease(pin: string) {
    setError(null);
    try {
      await reviewAndRelease.mutateAsync({ rating, comment: comment.trim() || null, pin });
      setConfirming(false);
      setReleased(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not release the payment.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{ title: releasing ? 'Approve & Pay' : 'Leave a Review' }}
      />
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

        {releasing ? (
          <Card>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>
                Final payment to release
              </Text>
              <MoneyText amount={amount} style={{ fontSize: 16, fontWeight: '700' }} />
            </View>
            <Text style={[styles.warning, { color: theme.textSecondary }]}>
              Submitting sends this payment to the provider and marks the job complete.
              This can&apos;t be undone — open a dispute instead if something is wrong.
            </Text>
          </Card>
        ) : null}

        {error ? (
          <Text selectable style={[styles.error, { color: theme.danger }]}>
            {error}
          </Text>
        ) : null}

        <Button
          title={releasing ? `Approve & release ${formatMoney(amount)}` : 'Submit review'}
          size="lg"
          icon={releasing ? 'checkmark-circle' : undefined}
          loading={pending}
          onPress={submit}
        />
      </ScrollView>

      <PinConfirmModal
        visible={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={confirmRelease}
        icon="checkmark-circle"
        title="Release final payment?"
        message="This pays the provider and marks the job complete. It cannot be undone — open a dispute instead if something is wrong."
        confirmLabel="Approve & pay"
        loading={reviewAndRelease.isPending}
        error={error}
        details={[
          { label: 'Your rating', value: <RatingStars rating={rating} size={14} showValue={false} /> },
          { label: 'Releasing now', value: <MoneyText amount={amount} style={Type.bodyMedium} /> },
        ]}
      />

      <SuccessModal
        visible={released}
        onClose={() => {
          setReleased(false);
          router.back();
        }}
        title="Payment released"
        message="The provider has been paid and this job is now complete. Thanks for leaving a review."
        amount={amount}
      />
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 15 },
  warning: { fontSize: 13, lineHeight: 18, marginTop: Spacing.two },
  error: { fontSize: 14 },
});
