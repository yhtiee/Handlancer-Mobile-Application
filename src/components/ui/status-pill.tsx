import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Radius, Spacing } from '@/constants/theme';
import type { JobStatus, QuoteStatus } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const JOB_TONE: Record<JobStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' },
  posted: { tone: 'info', label: 'Posted' },
  hiring: { tone: 'info', label: 'Reviewing quotes' },
  in_progress: { tone: 'warning', label: 'In progress' },
  completed: { tone: 'success', label: 'Completed' },
  disputed: { tone: 'danger', label: 'Disputed' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
};

const QUOTE_TONE: Record<QuoteStatus, { tone: Tone; label: string }> = {
  submitted: { tone: 'info', label: 'Submitted' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'danger', label: 'Rejected' },
  revised: { tone: 'warning', label: 'Revised' },
};

export function JobStatusPill({ status }: { status: JobStatus }) {
  const { tone, label } = JOB_TONE[status];
  return <Pill tone={tone} label={label} />;
}

export function QuoteStatusPill({ status }: { status: QuoteStatus }) {
  const { tone, label } = QUOTE_TONE[status];
  return <Pill tone={tone} label={label} />;
}

export function Pill({ tone, label }: { tone: Tone; label: string }) {
  const theme = useTheme();
  const map: Record<Tone, string> = {
    neutral: theme.textSecondary,
    info: theme.accent,
    success: theme.success,
    warning: theme.warning,
    danger: theme.danger,
  };
  const color = map[tone];

  return (
    <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
