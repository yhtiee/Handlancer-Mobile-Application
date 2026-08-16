import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ConfirmModal, MoneyText, SuccessModal } from '@/components/ui';
import { Spacing, Type } from '@/constants/theme';
import {
  useEscrow,
  useRequestCompletionReview,
  useRequestMaterialsRelease,
} from '@/queries/use-wallet';
import type { Job } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

type Pending = 'materials' | 'complete' | null;

/**
 * Provider-facing milestone actions. These only ever *request* — releasing funds
 * stays with the client, so a provider can never pay themselves.
 */
export function ProviderMilestones({ job }: { job: Job }) {
  const theme = useTheme();
  const { data: escrow } = useEscrow(job.id);
  const requestMaterials = useRequestMaterialsRelease(job.id);
  const requestReview = useRequestCompletionReview(job.id);

  const [confirming, setConfirming] = useState<Pending>(null);
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Nothing to act on until the client's money is actually held.
  if (!escrow || escrow.status === 'pending') return null;

  async function confirm() {
    setError(null);
    try {
      if (confirming === 'materials') {
        await requestMaterials.mutateAsync();
        setConfirming(null);
        setSuccess({
          title: 'Request sent',
          message: 'The client has been notified and can now release the materials funds.',
        });
      } else if (confirming === 'complete') {
        await requestReview.mutateAsync();
        setConfirming(null);
        setSuccess({
          title: 'Sent for review',
          message:
            'The client will review your work and release the final payment to your wallet.',
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  const busy = requestMaterials.isPending || requestReview.isPending;
  const canRequestMaterials =
    escrow.materials_amount > 0 && !escrow.materials_released && !escrow.materials_requested_at;
  const canMarkComplete = !escrow.workmanship_released && !escrow.completion_requested_at;
  const remaining =
    escrow.total - (escrow.materials_released ? escrow.materials_amount : 0);

  if (!canRequestMaterials && !canMarkComplete) return null;

  return (
    <View style={styles.wrap}>
      {canRequestMaterials ? (
        <Button
          title="Request materials funds"
          variant="secondary"
          icon="cube"
          onPress={() => setConfirming('materials')}
        />
      ) : null}

      {canMarkComplete ? (
        <>
          <Button
            title="Mark work complete"
            size="lg"
            icon="checkmark-circle"
            onPress={() => setConfirming('complete')}
          />
          <Text style={[Type.caption, { color: theme.textSecondary }]}>
            Upload your after photos first — the client reviews them before releasing payment.
          </Text>
        </>
      ) : null}

      <ConfirmModal
        visible={confirming === 'materials'}
        onCancel={() => setConfirming(null)}
        onConfirm={confirm}
        icon="cube"
        title="Request materials funds?"
        message="The client is notified and can release this portion early so you can buy materials."
        confirmLabel="Send request"
        loading={busy}
        error={error}
        details={[
          {
            label: 'Materials portion',
            value: <MoneyText amount={escrow.materials_amount} style={Type.bodyMedium} />,
          },
        ]}
      />

      <ConfirmModal
        visible={confirming === 'complete'}
        onCancel={() => setConfirming(null)}
        onConfirm={confirm}
        icon="checkmark-circle"
        title="Mark work complete?"
        message="This tells the client the job is finished so they can review it and release your final payment. Make sure your after photos are uploaded."
        confirmLabel="Mark complete"
        loading={busy}
        error={error}
        details={[
          {
            label: 'Final payment due',
            value: <MoneyText amount={remaining} style={Type.bodyMedium} />,
          },
        ]}
      />

      <SuccessModal
        visible={Boolean(success)}
        onClose={() => setSuccess(null)}
        title={success?.title ?? ''}
        message={success?.message}
        icon="paper-plane"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
});
