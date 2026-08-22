import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar, Icon, MoneyText } from '@/components/ui';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { Elevation, Radius, Spacing, Type } from '@/constants/theme';
import { timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import type { JobWithOwner } from '@/services/jobs';
import { useTheme } from '@/hooks/use-theme';

/**
 * Two-up card for the provider's Find Work feed.
 *
 * Half the width means ruthless ordering: a provider scanning open jobs decides
 * on money first, then whether the work and the area suit them, then who is
 * asking. So budget is the largest thing on the card and sits on its own line,
 * and everything else is one line each — nothing here wraps unpredictably and
 * changes the card's height, which is what makes a grid look broken.
 */
export function JobGridCard({ job, href }: { job: JobWithOwner; href?: Href }) {
  const theme = useTheme();
  const router = useRouter();

  // A direct invite is the one kind of job a provider is guaranteed to be able
  // to quote on, so it must not look identical to the open bids around it.
  const invited = job.is_direct && job.hired_provider_id != null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: invited ? theme.warning + '55' : theme.border,
          boxShadow: Elevation.sm,
        },
      ]}
      onPress={() => router.push(href ? href : routes.findWorkJob(job.id))}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: theme.tint + '1F' }]}>
          <Icon name={categoryIcon(job.category)} size={16} color={theme.tint} />
        </View>
        {invited ? (
          <View style={[styles.invite, { backgroundColor: theme.warning + '1F' }]}>
            <Icon name="mail" size={9} color={theme.warning} />
            <Text style={[Type.micro, { color: theme.warning }]}>INVITE</Text>
          </View>
        ) : (
          <Text numberOfLines={1} style={[Type.micro, styles.category, { color: theme.textSecondary }]}>
            {categoryLabel(job.category).toUpperCase()}
          </Text>
        )}
      </View>

      <Text numberOfLines={2} style={[Type.title, styles.title, { color: theme.text }]}>
        {job.title}
      </Text>

      {/* Who is asking. Providers were bidding blind before this. */}
      <View style={styles.metaRow}>
        <Avatar uri={job.owner?.avatar_url} name={job.owner?.name} size={18} />
        <Text numberOfLines={1} style={[Type.caption, styles.metaText, { color: theme.textSecondary }]}>
          {job.owner?.name ?? 'HandLancer customer'}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Icon name="location-outline" size={12} color={theme.textSecondary} />
        <Text numberOfLines={1} style={[Type.caption, styles.metaText, { color: theme.textSecondary }]}>
          {job.location || 'Location not set'}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.footer}>
        {job.budget != null ? (
          <MoneyText amount={job.budget} compact style={[Type.h3, { color: theme.text }]} />
        ) : (
          <Text style={[Type.callout, { color: theme.tint }]}>Open budget</Text>
        )}
        <Text style={[Type.micro, { color: theme.textSecondary }]}>{timeAgo(job.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // Paired with `justifyContent: 'space-between'` on the column wrapper: a
    // lone card on an odd last row keeps its width instead of stretching wide.
    width: '48%',
    padding: Spacing.twoHalf,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: { flexShrink: 1, textAlign: 'right', marginLeft: Spacing.one },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  // Fixed height for two lines keeps every card in a row the same height.
  title: { minHeight: 44, marginTop: Spacing.half },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  metaText: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginTop: Spacing.one },
  footer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
});
