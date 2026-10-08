import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatMoney, Icon } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { categoryLabel } from '@/constants/categories';
import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/date';
import type { Job } from '@/services/database.types';

/**
 * An open job as a list row: what, where, how fresh, and the budget — the
 * number a provider scans for — right-aligned so a column of budgets reads at
 * a glance. A direct invite says so above the title.
 */
export function JobRow({ job, href }: { job: Job; href: Href }) {
  const theme = useTheme();
  const router = useRouter();
  const invited = job.is_direct && job.hired_provider_id != null;
  const meta = [job.location || categoryLabel(job.category), timeAgo(job.created_at)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
        <View style={{ flex: 1 }}>
          {invited ? (
            <View style={styles.invite}>
              <Icon name="mail-outline" size={13} color={theme.accent} />
              <Text style={[Type.caption, { color: theme.accent, fontWeight: '600' }]}>
                Invited to quote
              </Text>
            </View>
          ) : null}
          <Text numberOfLines={2} style={[Type.title, { color: theme.text }]}>
            {job.title}
          </Text>
          <Text numberOfLines={1} style={[Type.caption, { color: theme.textSecondary }]}>
            {meta}
          </Text>
        </View>
        {job.budget != null ? (
          <Text style={[styles.budget, { color: theme.text }]}>{formatMoney(job.budget)}</Text>
        ) : (
          <Text style={[Type.caption, { color: theme.textSecondary, marginTop: 2 }]}>Open budget</Text>
        )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.twoHalf,
    paddingVertical: Spacing.three - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  invite: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: 2 },
  budget: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
});
