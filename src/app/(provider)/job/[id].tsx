import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ProofUploader } from '@/components/media/proof-uploader';
import { Card, GlobalLoader, Icon, JobStatusPill, MoneyText, Screen } from '@/components/ui';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { Radius, Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/date';
import { useJob } from '@/queries/use-jobs';
import { useJobMedia } from '@/queries/use-media';
import { useTheme } from '@/hooks/use-theme';

export default function ProviderJobDetail() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const { data: media } = useJobMedia(id);

  if (isLoading || !job) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: '' }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={{ color: theme.textSecondary }}>Job not found.</Text>
        )}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: theme.tint + '22' }]}>
            <Icon name={categoryIcon(job.category)} size={28} color={theme.tint} />
          </View>
          <Text selectable style={[styles.title, { color: theme.text }]}>
            {job.title}
          </Text>
          <View style={styles.metaRow}>
            <JobStatusPill status={job.status} />
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {categoryLabel(job.category)} · hired {timeAgo(job.created_at)}
            </Text>
          </View>
        </View>

        {job.budget != null ? (
          <Card>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Budget</Text>
              <MoneyText amount={job.budget} style={{ fontSize: 15 }} />
            </View>
          </Card>
        ) : null}

        {job.description ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
            <Text selectable style={[styles.body, { color: theme.textSecondary }]}>
              {job.description}
            </Text>
          </View>
        ) : null}

        <ProofUploader jobId={job.id} media={media ?? []} />

        {job.status === 'completed' ? (
          <Text style={[styles.done, { color: theme.success }]}>
            Job completed — payment released to your wallet.
          </Text>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { gap: Spacing.four, paddingTop: Spacing.three },
  header: { gap: Spacing.two },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 28, height: 28 },
  title: { fontSize: 26, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  meta: { fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 15 },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  done: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
