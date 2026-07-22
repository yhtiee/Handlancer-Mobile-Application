import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, MoneyText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useJobQuotes } from '@/queries/use-quotes';
import {
  useEscrow,
  useFundEscrow,
  useReleaseMaterials,
  useReleaseWorkmanship,
} from '@/queries/use-wallet';
import type { Job } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

/** Owner-facing escrow controls shown on a hired job. */
export function EscrowSection({ job }: { job: Job }) {
  const theme = useTheme();
  const { data: escrow } = useEscrow(job.id);
  const { data: quotes } = useJobQuotes(job.id);
  const approved = quotes?.find((q) => q.status === 'approved');

  const fund = useFundEscrow(job.id);
  const releaseMaterials = useReleaseMaterials(job.id);
  const releaseFinal = useReleaseWorkmanship(job.id);
  const [error, setError] = useState<string | null>(null);

  // Escrow only applies once a provider is hired.
  if (!job.hired_provider_id || (!approved && !escrow)) return null;

  function run(mutate: { mutateAsync: () => Promise<unknown> }) {
    setError(null);
    mutate.mutateAsync().catch((e: unknown) =>
      setError(e instanceof Error ? e.message : 'Something went wrong'),
    );
  }

  const funded = !!escrow && escrow.status !== 'pending';
  const remaining = escrow
    ? escrow.total - (escrow.materials_released ? escrow.materials_amount : 0)
    : 0;

  return (
    <Card>
      <Text style={[styles.title, { color: theme.text }]}>Escrow</Text>

      {!funded && approved ? (
        <>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Fund the agreed amount into escrow so work can begin. The provider is paid as
            milestones are released.
          </Text>
          <Row label="Agreed total">
            <MoneyText amount={approved.total} style={{ fontSize: 15 }} />
          </Row>
          <Button
            title="Fund escrow"
            size="lg"
            icon="lock-closed"
            loading={fund.isPending}
            onPress={() => run(fund)}
            style={{ marginTop: Spacing.three }}
          />
        </>
      ) : null}

      {funded && escrow ? (
        <>
          <Row label="In escrow">
            <MoneyText amount={escrow.total} style={{ fontSize: 15 }} />
          </Row>
          <Row label="Materials">
            <Text style={{ color: escrow.materials_released ? theme.success : theme.textSecondary, fontWeight: '600' }}>
              {escrow.materials_amount <= 0
                ? 'None'
                : escrow.materials_released
                  ? 'Released'
                  : 'Held'}
            </Text>
          </Row>

          {escrow.status === 'completed' ? (
            <Text style={[styles.done, { color: theme.success }]}>
              All funds released. Job complete.
            </Text>
          ) : (
            <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
              {escrow.materials_amount > 0 && !escrow.materials_released ? (
                <Button
                  title="Release materials funds"
                  variant="secondary"
                  icon="cube"
                  loading={releaseMaterials.isPending}
                  onPress={() => run(releaseMaterials)}
                />
              ) : null}
              <Button
                title="Release final payment"
                size="lg"
                icon="checkmark-circle"
                loading={releaseFinal.isPending}
                onPress={() => run(releaseFinal)}
              />
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Releasing the final payment ({''}
                <MoneyText amount={remaining} compact style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }} />
                ) marks the job complete.
              </Text>
            </View>
          )}
        </>
      ) : null}

      {error ? (
        <Text selectable style={[styles.error, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '700', marginBottom: Spacing.one },
  body: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.two },
  rowLabel: { fontSize: 15 },
  hint: { fontSize: 13, lineHeight: 18 },
  done: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: Spacing.three },
  error: { fontSize: 14, marginTop: Spacing.three },
});
