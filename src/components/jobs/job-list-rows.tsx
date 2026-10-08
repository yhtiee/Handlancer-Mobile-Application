import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { escrowAmounts, EscrowTape } from '@/components/escrow/escrow-tape';
import { Avatar, formatMoney } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Layout, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/date';
import { jobNextStep, providerNextStep } from '@/lib/job-state';
import { categoryPhoto, providerImageFallback } from '@/lib/provider-images';
import { routes } from '@/lib/routes';
import { useProvider } from '@/queries/use-providers';
import { useJobQuotes } from '@/queries/use-quotes';
import { useMyReviewForJob } from '@/queries/use-reviews';
import { useEscrow } from '@/queries/use-wallet';
import type { Escrow, Job } from '@/services/database.types';
import type { QuoteWithJob } from '@/services/quotes';

/**
 * Rows for the Jobs tabs. Each row loads only its own escrow / quotes /
 * person, and rows only exist while on screen (FlatList), so a list of ten
 * thousand jobs costs no more than a list of ten.
 */

/** A small capsule action inside a row; teal when it moves money. */
function RowAction({ label, money, onPress }: { label: string; money?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.rowAction,
        { backgroundColor: money ? theme.tint : theme.backgroundElement, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Text style={[styles.rowActionText, { color: money ? theme.tintText : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function Row({
  onPress,
  leading,
  title,
  amount,
  line,
  attention,
  escrow,
  action,
  dim,
}: {
  onPress: () => void;
  leading?: React.ReactNode;
  title: string;
  amount?: string | null;
  line: string;
  attention?: boolean;
  escrow?: Escrow | null;
  action?: React.ReactNode;
  dim?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      {leading}
      <View style={{ flex: 1, gap: Spacing.one + 2 }}>
        <View style={styles.top}>
          <Text numberOfLines={1} style={[Type.title, { flex: 1, color: dim ? theme.textSecondary : theme.text }]}>
            {title}
          </Text>
          {amount ? <Text style={[styles.amount, { color: dim ? theme.textSecondary : theme.text }]}>{amount}</Text> : null}
        </View>
        <View style={styles.lineRow}>
          {attention ? <View style={[styles.dot, { backgroundColor: theme.tint }]} /> : null}
          <Text
            numberOfLines={1}
            style={[
              Type.caption,
              { flex: 1, color: attention ? theme.text : theme.textSecondary },
              attention && { fontWeight: '600' },
            ]}>
            {line}
          </Text>
        </View>
        {escrow && escrow.status !== 'pending' ? <EscrowTape escrow={escrow} size="row" labelled={false} /> : null}
        {action ? <View style={styles.actionWrap}>{action}</View> : null}
      </View>
    </Pressable>
  );
}

/* ───────────────────────── Client ───────────────────────── */

export function ClientJobRow({ job }: { job: Job }) {
  const theme = useTheme();
  const router = useRouter();
  const open = job.status === 'draft' || job.status === 'posted' || job.status === 'hiring';
  const { data: escrow } = useEscrow(job.status === 'draft' || job.status === 'posted' ? '' : job.id);
  const { data: quotes } = useJobQuotes(open ? job.id : '');
  const { data: provider } = useProvider(job.hired_provider_id ?? '');
  const reviewable = job.status === 'completed' && !!job.hired_provider_id;
  const { data: review, isLoading: reviewLoading } = useMyReviewForJob(reviewable ? job.id : '');
  const step = jobNextStep(job, escrow, quotes, provider?.name);
  const needs = step.lane === 'needs';

  const amount =
    job.status === 'in_progress' && escrow && escrow.status !== 'pending'
      ? `${formatMoney(escrowAmounts(escrow).held)} held`
      : job.status === 'completed' && escrow
        ? formatMoney(escrow.total)
        : job.budget != null
          ? formatMoney(job.budget)
          : null;

  const line =
    step.lane === 'done'
      ? [job.status === 'completed' ? 'Finished' : 'Cancelled', provider?.name ? `with ${provider.name.split(' ')[0]}` : null, timeAgo(job.created_at)]
          .filter(Boolean)
          .join(' · ')
      : step.lane === 'waiting'
        ? `Posted ${timeAgo(job.created_at)} · no quotes yet`
        : step.headline;

  const action =
    needs && step.action ? (
      <RowAction label={step.action.label} money={step.action.money} onPress={() => router.push(step.action!.href)} />
    ) : reviewable && !reviewLoading && !review ? (
      <RowAction label="Leave a review" onPress={() => router.push(routes.reviewJob(job.id))} />
    ) : null;

  return (
    <Row
      onPress={() => router.push(routes.jobDetail(job.id))}
      leading={
        <Image
          source={provider ? (provider.avatar_url ?? providerImageFallback(provider)) : categoryPhoto(job.category ?? 'other')}
          style={[styles.lead, provider ? styles.leadRound : null, { backgroundColor: theme.backgroundElement }]}
          contentFit="cover"
          contentPosition="top"
        />
      }
      title={job.title}
      amount={amount}
      line={line}
      attention={needs}
      escrow={job.status === 'in_progress' ? escrow : null}
      action={action}
      dim={job.status === 'cancelled'}
    />
  );
}

/* ───────────────────────── Provider ───────────────────────── */

export function ProviderJobRow({ job }: { job: Job }) {
  const router = useRouter();
  const { data: escrow } = useEscrow(job.id);
  const { data: client } = useProvider(job.owner_id);
  const step = providerNextStep(job, escrow, client?.name);
  const yours = step.lane === 'yours';
  const open = () => router.push(routes.providerJobDetail(job.id));

  const amount =
    job.status === 'completed' && escrow
      ? formatMoney(escrow.total)
      : escrow && escrow.status !== 'pending'
        ? `${formatMoney(escrowAmounts(escrow).held)} to come`
        : null;
  const line =
    step.lane === 'done'
      ? [client?.name ? `For ${client.name.split(' ')[0]}` : null, job.location, timeAgo(job.created_at)].filter(Boolean).join(' · ')
      : step.headline;

  return (
    <Row
      onPress={open}
      leading={<Avatar uri={client?.avatar_url} name={client?.name} size={48} />}
      title={job.title}
      amount={amount}
      line={line}
      attention={yours}
      escrow={job.status === 'in_progress' ? escrow : null}
      action={yours && step.action ? <RowAction label={step.action.label} money={step.action.money} onPress={open} /> : null}
    />
  );
}

export function ProviderQuoteRow({ quote }: { quote: QuoteWithJob }) {
  const router = useRouter();
  const line =
    quote.status === 'approved'
      ? 'Accepted · waiting for payment'
      : quote.status === 'rejected'
        ? 'Not chosen'
        : `Sent ${timeAgo(quote.created_at)} · waiting for the client`;
  return (
    <Row
      onPress={() => router.push(routes.providerQuote(quote.id))}
      title={quote.job?.title ?? 'Job'}
      amount={formatMoney(quote.total)}
      line={line}
      attention={quote.status === 'approved'}
      dim={quote.status === 'rejected'}
    />
  );
}

/* ───────────────────────── Attention strip ───────────────────────── */

export type AttentionItem = { key: string; title: string; headline: string; label: string; money?: boolean; href: Href };

/**
 * "Waiting on you": a short horizontal strip of the newest things that need
 * a tap, at the top of the list. Fixed height, so however many jobs there
 * are, the segments below stay one glance away.
 */
export function AttentionStrip({ title, items }: { title: string; items: AttentionItem[] }) {
  const theme = useTheme();
  const router = useRouter();
  if (!items.length) return null;
  return (
    <View style={{ gap: Spacing.two }}>
      <Text style={[Type.caption, { color: theme.textSecondary, paddingHorizontal: Layout.gutter }]}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Layout.gutter, gap: Spacing.twoHalf }}>
        {items.map((it) => (
          <Pressable
            key={it.key}
            onPress={() => router.push(it.href)}
            style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <Text numberOfLines={1} style={[Type.caption, { color: theme.textSecondary }]}>
              {it.title}
            </Text>
            <Text numberOfLines={2} style={[Type.title, { color: theme.text, flex: 1 }]}>
              {it.headline}
            </Text>
            <RowAction label={it.label} money={it.money} onPress={() => router.push(it.href)} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
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
  lead: { width: 48, height: 48, borderRadius: Radius.md, borderCurve: 'continuous' },
  leadRound: { borderRadius: 24 },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  amount: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  actionWrap: { flexDirection: 'row', marginTop: Spacing.one },
  rowAction: { height: 36, borderRadius: 18, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  rowActionText: { fontSize: 13, fontWeight: '600' },
  card: {
    width: 248,
    height: 150,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.one + 2,
    alignItems: 'flex-start',
  },
});
