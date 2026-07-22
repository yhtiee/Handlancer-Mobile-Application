import { Link, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Icon, JobStatusPill, MoneyText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import type { Job } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

export function JobCard({ job, href }: { job: Job; href?: Href }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement},
      ]}
      onPress={() => router.push(href ? href : routes.jobDetail(job.id))}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: theme.tint + '22' }]}>
          <Icon name={categoryIcon(job.category)} size={22} color={theme.tint} />
        </View>
        <View style={styles.titleCol}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
            {job.title}
          </Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {categoryLabel(job.category)} · {timeAgo(job.created_at)}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <JobStatusPill status={job.status} />
        {job.budget != null ? (
          <MoneyText amount={job.budget} compact style={styles.budget} />
        ) : (
          <Text style={[styles.meta, { color: theme.textSecondary }]}>Open budget</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    gap: Spacing.three,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 22, height: 22 },
  titleCol: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budget: { fontSize: 15 },
});
