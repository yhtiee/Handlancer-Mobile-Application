import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ConfirmModal, MoneyText, SuccessModal } from '@/components/ui';
import { Spacing, Type } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useJobQuotes } from '@/queries/use-quotes';
import { useEscrow, useFundEscrow, useReleaseMaterials } from '@/queries/use-wallet';
import type { Job } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

type Pending = 'fund' | 'materials' | null;

/**
 * Client-facing escrow actions. State is shown by EscrowTimeline — this is only
 * the buttons, each gated behind a confirmation that states the amount, because
 * none of these movements can be undone from inside the app.
 */
export function EscrowSection({ job }: { job: Job }) {
  const theme = useTheme();
  const router = useRouter();
  const { data: escrow } = useEscrow(job.id);
  const { data: quotes } = useJobQuotes(job.id);
  const approved = quotes?.find((q) => q.status === 'approved');

  const fund = useFundEscrow(job.id);
  const releaseMaterials = useReleaseMaterials(job.id);

  const [confirming, setConfirming] = useState<Pending>(null);
  const [success, setSuccess] = useState<{ title: string; message: string; amount?: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  if (!approved && !escrow) return null;

  const funded = Boolean(escrow) && escrow!.status !== 'pending';
  const materialsDue =
    !!escrow && escrow.materials_amount > 0 && !escrow.materials_released && funded;
  const finalDue = !!escrow && funded && !escrow.workmanship_released;

  async function confirm() {
    setError(null);
    try {
      if (confirming === 'fund') {
        await fund.mutateAsync();
        setConfirming(null);
        setSuccess({
          title: 'Provider hired',
          message: 'Your payment is now held in escrow and work can begin.',
          amount: approved?.total,
        });
      } else if (confirming === 'materials') {
        await releaseMaterials.mutateAsync();
        setConfirming(null);
        setSuccess({
          title: 'Materials released',
          message: 'The funds are on their way to the provider’s wallet.',
          amount: escrow?.materials_amount,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  const busy = fund.isPending || releaseMaterials.isPending;

  return (
    <View style={styles.wrap}>
      {!funded && approved ? (
        <>
          <Button
            title="Fund escrow & hire"
            size="lg"
            icon="lock-closed"
            onPress={() => setConfirming('fund')}
          />
          <Text style={[Type.caption, { color: theme.textSecondary }]}>
            The provider is only hired once the money is held.
          </Text>
        </>
      ) : null}

      {materialsDue ? (
        <>
          {escrow!.materials_requested_at ? (
            <View style={[styles.request, { backgroundColor: theme.tint + '14' }]}>
              <Text style={[Type.callout, { color: theme.tint }]}>
                The provider has requested the materials funds.
              </Text>
            </View>
          ) : null}
          <Button
            title="Release materials funds"
            variant="secondary"
            icon="cube"
            onPress={() => setConfirming('materials')}
          />
        </>
      ) : null}

      {finalDue ? (
        <>
          {escrow!.completion_requested_at ? (
            <View style={[styles.request, { backgroundColor: theme.tint + '14' }]}>
              <Text style={[Type.callout, { color: theme.tint }]}>
                The provider marked the work complete and is waiting for your review.
              </Text>
            </View>
          ) : null}
          {/* Rating and payout are one transaction, so this opens the review screen
              rather than releasing from here. */}
          <Button
            title="Review & release final payment"
            size="lg"
            icon="checkmark-circle"
            onPress={() => router.push(routes.reviewJob(job.id))}
          />
        </>
      ) : null}

      <ConfirmModal
        visible={confirming === 'fund'}
        onCancel={() => setConfirming(null)}
        onConfirm={confirm}
        icon="lock-closed"
        title="Fund escrow & hire"
        message="This moves money from your wallet into escrow. It is held safely and only released when you approve the work."
        confirmLabel="Pay & hire"
        loading={busy}
        error={error}
        details={[
          {
            label: 'Amount to hold',
            value: <MoneyText amount={approved?.total ?? 0} style={Type.bodyMedium} />,
          },
        ]}
      />

      <ConfirmModal
        visible={confirming === 'materials'}
        onCancel={() => setConfirming(null)}
        onConfirm={confirm}
        icon="cube"
        title="Release materials funds?"
        message="This pays the materials portion to the provider now. It cannot be reversed from the app."
        confirmLabel="Release funds"
        loading={busy}
        error={error}
        details={[
          {
            label: 'Releasing now',
            value: <MoneyText amount={escrow?.materials_amount ?? 0} style={Type.bodyMedium} />,
          },
          {
            label: 'Still in escrow',
            value: (
              <MoneyText
                amount={(escrow?.total ?? 0) - (escrow?.materials_amount ?? 0)}
                style={[Type.bodyMedium, { color: theme.textSecondary }]}
              />
            ),
          },
        ]}
      />

      <SuccessModal
        visible={Boolean(success)}
        onClose={() => setSuccess(null)}
        title={success?.title ?? ''}
        message={success?.message}
        amount={success?.amount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  request: {
    padding: Spacing.twoHalf,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
});
