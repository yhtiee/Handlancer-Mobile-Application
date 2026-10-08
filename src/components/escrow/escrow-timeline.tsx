import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Icon, type IconName, MoneyText } from '@/components/ui';
import { Radius, Spacing, Type } from '@/constants/theme';
import type { Escrow, Job } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

type StepState = 'done' | 'active' | 'upcoming';

type Step = {
  key: string;
  title: string;
  detail: string;
  amount?: number;
  state: StepState;
  icon: IconName;
};

/**
 * The escrow lifecycle as a vertical timeline rather than a list of status text.
 * Both shells render the same component so a milestone means the same thing on
 * either side of the job; only the wording changes with `role`.
 */
export function EscrowTimeline({
  job,
  escrow,
  role,
}: {
  job: Job;
  escrow: Escrow | null | undefined;
  role: 'client' | 'provider';
}) {
  const theme = useTheme();
  const steps = buildSteps(job, escrow, role);
  if (!steps.length) return null;


  return (
    <View style={styles.wrap}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const dim = step.state === 'upcoming';

        return (
          <View key={step.key} style={styles.row}>
            {/* Rail: dot plus the connector down to the next step. */}
            <View style={styles.rail}>
              {/* Done is a filled ink check, the live step an ink ring, the rest
                  a hairline ring. Teal stays on the tape. */}
              <View
                style={[
                  styles.dot,
                  step.state === 'done'
                    ? { backgroundColor: theme.text, borderColor: theme.text }
                    : step.state === 'active'
                      ? { borderColor: theme.text, borderWidth: 2 }
                      : { borderColor: theme.backgroundSelected, borderWidth: 1.5 },
                ]}>
                {step.state === 'done' ? (
                  <Icon name="checkmark" size={14} color={theme.background} />
                ) : null}
              </View>
              {!last ? (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: step.state === 'done' ? theme.text : theme.border },
                  ]}
                />
              ) : null}
            </View>

            <View style={[styles.body, last && { paddingBottom: 0 }]}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    Type.bodyMedium,
                    { color: dim ? theme.textSecondary : theme.text, flex: 1 },
                  ]}>
                  {step.title}
                </Text>
                {step.amount != null ? (
                  <MoneyText
                    amount={step.amount}
                    style={[Type.callout, { color: dim ? theme.textSecondary : theme.text }]}
                  />
                ) : null}
              </View>
              <Text style={[Type.caption, { color: theme.textSecondary }]}>{step.detail}</Text>

            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Derives the steps from escrow state. Materials only appear when the approved
 * quote actually included them — showing an empty materials milestone on a
 * labour-only job reads as something the user forgot to do.
 */
function buildSteps(
  job: Job,
  escrow: Escrow | null | undefined,
  role: 'client' | 'provider',
): Step[] {
  const client = role === 'client';
  const funded = Boolean(escrow) && escrow!.status !== 'pending';
  const steps: Step[] = [];

  steps.push({
    key: 'funded',
    title: funded ? 'Escrow funded' : 'Awaiting escrow payment',
    detail: funded
      ? client
        ? 'Your payment is held safely until you release it'
        : 'The client’s payment is held safely for this job'
      : client
        ? 'Fund escrow to confirm hiring'
        : 'The client has not funded escrow yet',
    amount: escrow?.total,
    state: funded ? 'done' : 'active',
    icon: 'lock-closed',
  });

  if (escrow && escrow.materials_amount > 0) {
    const released = escrow.materials_released;
    const requested = Boolean(escrow.materials_requested_at);
    steps.push({
      key: 'materials',
      title: released ? 'Materials released' : 'Materials funds',
      detail: released
        ? client
          ? 'Sent to the provider'
          : 'Paid into your wallet'
        : requested
          ? client
            ? 'The provider has requested these funds'
            : 'Requested — waiting for the client'
          : client
            ? 'Release when the provider needs to buy materials'
            : 'Request when you are ready to buy materials',
      amount: escrow.materials_amount,
      state: released ? 'done' : funded ? 'active' : 'upcoming',
      icon: 'cube',
    });
  }

  if (escrow) {
    const submitted = Boolean(escrow.completion_requested_at);
    const paid = escrow.workmanship_released;
    steps.push({
      key: 'work',
      title: paid ? 'Work approved' : submitted ? 'Awaiting your review' : 'Work in progress',
      detail: paid
        ? 'The client approved the finished work'
        : submitted
          ? client
            ? 'Review the work to release the final payment'
            : 'The client is reviewing your work'
          : client
            ? 'The provider will mark this complete when finished'
            : 'Mark complete when the job is finished',
      state: paid ? 'done' : submitted ? 'active' : funded ? 'upcoming' : 'upcoming',
      icon: 'construct',
    });

    const remaining = escrow.total - (escrow.materials_released ? escrow.materials_amount : 0);
    steps.push({
      key: 'final',
      title: paid ? 'Final payment released' : 'Final payment',
      detail: paid
        ? client
          ? 'Job complete'
          : 'Paid into your wallet'
        : client
          ? 'Released when you approve the work'
          : 'Released once the client approves',
      amount: remaining > 0 ? remaining : undefined,
      state: paid ? 'done' : 'upcoming',
      icon: 'card',
    });
  }

  return steps;
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  row: { flexDirection: 'row', gap: Spacing.three },
  rail: { alignItems: 'center', width: 22 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: { width: 1.5, flex: 1, minHeight: Spacing.three, marginVertical: Spacing.one },
  body: { flex: 1, gap: 2, paddingBottom: Spacing.threeHalf },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
