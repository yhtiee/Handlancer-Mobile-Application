import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Icon, JobStatusPill, MoneyText } from '@/components/ui';
import { Radius, Spacing, Type } from '@/constants/theme';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import type { Job } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

export function JobCard({ job, href }: { job: Job; href?: Href }) {
  const theme = useTheme();
  const router = useRouter();

  // A direct invite is worth surfacing on the card: it is the one kind of job a
  // provider is guaranteed to be able to quote on, so it should not look
  // identical to the open bids around it.
  const invited = job.is_direct && job.hired_provider_id != null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      onPress={() => router.push(href ? href : routes.jobDetail(job.id))}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: theme.tint + '1F' }]}>
          <Icon name={categoryIcon(job.category)} size={22} color={theme.tint} />
        </View>
        <View style={styles.titleCol}>
          <Text numberOfLines={1} style={[Type.title, { color: theme.text }]}>
            {job.title}
          </Text>
          <Text style={[Type.caption, { color: theme.textSecondary }]}>
            {categoryLabel(job.category)} · {timeAgo(job.created_at)}
          </Text>
        </View>
        {invited ? (
          <View style={[styles.invite, { backgroundColor: theme.warning + '1F' }]}>
            <Icon name="mail" size={11} color={theme.warning} />
            <Text style={[Type.micro, { color: theme.warning }]}>INVITE</Text>
          </View>
        ) : null}
      </View>

      {job.location ? (
        <View style={styles.locationRow}>
          <Icon name="location-outline" size={13} color={theme.textSecondary} />
          <Text numberOfLines={1} style={[Type.caption, { color: theme.textSecondary, flex: 1 }]}>
            {job.location}
          </Text>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <JobStatusPill status={job.status} />
        {job.budget != null ? (
          <MoneyText amount={job.budget} compact style={[Type.title, { color: theme.text }]} />
        ) : (
          <Text style={[Type.caption, { color: theme.textSecondary }]}>Open budget</Text>
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
    gap: Spacing.twoHalf,
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
  titleCol: { flex: 1, gap: 2 },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
