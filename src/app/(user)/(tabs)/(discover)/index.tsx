import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { escrowAmounts, EscrowTape, escrowStage } from '@/components/escrow/escrow-tape';
import { ProviderRow } from '@/components/providers/provider-row';
import {
  Avatar,
  EmptyState,
  formatMoney,
  GlassButton,
  Icon,
  ListSkeleton,
  PhotoHeader,
  ScreenView,
  SearchField,
} from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Categories } from '@/constants/categories';
import { Layout, Radius, Spacing, Type, TypeItalic } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTabBarInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/date';
import { providerImageFallback } from '@/lib/provider-images';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useMyJobs } from '@/queries/use-jobs';
import { useUnreadCount } from '@/queries/use-notifications';
import { useProvider, useProviders } from '@/queries/use-providers';
import { useJobQuotes } from '@/queries/use-quotes';
import { useEscrow, useWallet } from '@/queries/use-wallet';
import type { Job } from '@/services/database.types';

const WELCOME_PHOTO = require('@/assets/images/providers/tailor.png');
/** The trades offered as one-tap starts for a new job. */
const TRADES = Categories.filter((c) =>
  ['plumbing', 'electrical', 'carpentry', 'ac', 'painting', 'cleaning'].includes(c.id),
);

/**
 * Client home. It leads with the job already under way — the person doing it,
 * where the money stands — because that is what the client opens the app to
 * check. Starting a new job and finding someone nearby follow.
 */
export default function Discover() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const bottomInset = useTabBarInset();
  const unread = useUnreadCount();
  const { data: wallet } = useWallet();

  const active = useInfiniteList(useMyJobs('active')).items[0] as Job | undefined;
  const open = useInfiniteList(useMyJobs('open')).items as Job[];

  const [search, setSearch] = useState('');
  // The field stays instant; the query only sees what the user settled on.
  const debouncedSearch = useDebouncedValue(search);
  const providersQuery = useProviders(debouncedSearch);
  const { items: providers } = useInfiniteList(providersQuery);

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset }}>
        <Hero
          job={active}
          location={profile?.location}
          balance={wallet?.balance}
          unread={unread}
        />

        <View style={styles.body}>
          {active ? <LiveMoney job={active} /> : null}
          <QuotesWaiting jobs={open} />

          {/* The way in to a new job. Tapping opens the full form; a trade
              opens it with the trade already picked. */}
          <View style={styles.ask}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(routes.postJob)}
              style={[styles.askField, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.askText, { color: theme.textSecondary }]}>What needs fixing?</Text>
              <View style={[styles.askGo, { backgroundColor: theme.tint }]}>
                <Text style={[styles.askGoText, { color: theme.tintText }]}>Post</Text>
              </View>
            </Pressable>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -Layout.gutter }}
              contentContainerStyle={styles.trades}>
              {TRADES.map((t) => (
                <Pressable key={t.id} hitSlop={10} onPress={() => router.push(routes.postJobIn(t.id))}>
                  <Text style={[Type.caption, { color: theme.textSecondary }]}>{t.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Near you */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={[Type.h3, { color: theme.text }]}>Near you</Text>
              <Pressable hitSlop={10} onPress={() => router.push(routes.browseProviders)}>
                <Text style={[Type.caption, { color: theme.textSecondary }]}>Browse all</Text>
              </Pressable>
            </View>
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Search a service or provider"
            />
            {providersQuery.isLoading ? (
              <ListSkeleton />
            ) : providers.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title={debouncedSearch ? 'No matches' : 'No providers yet'}
                description={
                  debouncedSearch
                    ? 'Try a different name, skill or area.'
                    : 'Tradespeople near you will show up here as they join.'
                }
              />
            ) : (
              // Real providers only. Padding this with invented people made an
              // empty marketplace look populated, and tapping one led nowhere.
              providers.slice(0, 5).map((p) => <ProviderRow key={p.id} provider={p} />)
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenView>
  );
}

/** The photo and sentence at the top: the live job, or an invitation to start one. */
function Hero({
  job,
  location,
  balance,
  unread,
}: {
  job?: Job;
  location?: string | null;
  balance?: number;
  unread: number;
}) {
  const router = useRouter();
  const { data: provider } = useProvider(job?.hired_provider_id ?? '');
  const { data: escrow } = useEscrow(job?.id ?? '');

  const first = provider?.name?.trim().split(' ')[0];
  const stage = escrow ? escrowStage(escrow) : null;

  const controls = (
    <>
      <GlassButton
        onPhoto
        icon="location-outline"
        label={location?.trim() || 'Set your location'}
        onPress={() => router.push(routes.profileEdit('user'))}
        style={{ flexShrink: 1 }}
      />
      <View style={styles.controlsRight}>
        <GlassButton
          onPhoto
          icon="wallet-outline"
          label={balance != null ? formatMoney(balance, 'NGN', true) : undefined}
          accessibilityLabel="Wallet"
          onPress={() => router.push(routes.wallet('user'))}
        />
        <GlassButton
          onPhoto
          icon="notifications-outline"
          badge={unread}
          accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          onPress={() => router.push(routes.profileNotifications('user'))}
        />
      </View>
    </>
  );

  if (!job) {
    return (
      <PhotoHeader source={WELCOME_PHOTO} contentPosition="top" controls={controls}>
        <Text style={[Type.serif, styles.onPhoto]}>
          Who do you need <Text style={TypeItalic}>today?</Text>
        </Text>
      </PhotoHeader>
    );
  }

  const photo = provider ? (provider.avatar_url ?? providerImageFallback(provider)) : null;
  return (
    <Pressable onPress={() => router.push(routes.jobDetail(job.id))}>
      <PhotoHeader
        source={photo}
        contentPosition="top"
        controls={controls}
        eyebrow={stage ? `Stage ${stage.index} of ${stage.count} · ${stage.label}` : 'In progress'}>
        <Text numberOfLines={4} style={[Type.serif, styles.onPhoto]}>
          {first ? `${first} is on ` : 'Work has started on '}
          <Text style={TypeItalic}>{job.title}.</Text>
        </Text>
      </PhotoHeader>
    </Pressable>
  );
}

/** What is held for the live job, as a tape. */
function LiveMoney({ job }: { job: Job }) {
  const theme = useTheme();
  const router = useRouter();
  const { data: escrow } = useEscrow(job.id);
  if (!escrow || escrow.status === 'pending') return null;
  const { held } = escrowAmounts(escrow);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(routes.jobDetail(job.id))}
      style={{ gap: Spacing.twoHalf }}>
        <View style={styles.held}>
          <Text style={[styles.heldAmount, { color: theme.text }]}>{formatMoney(held)}</Text>
          <Text style={[Type.body, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
            {held > 0 ? 'held for the next payment' : 'paid out in full'}
          </Text>
        </View>
        <EscrowTape escrow={escrow} size="inline" />
    </Pressable>
  );
}

/** "3 quotes for Kitchen sink leak": the newest open job that has quotes in. */
function QuotesWaiting({ jobs }: { jobs: Job[] }) {
  const candidate = jobs.find((j) => j.status === 'hiring' || j.status === 'posted');
  if (!candidate) return null;
  return <QuotesRow job={candidate} />;
}

function QuotesRow({ job }: { job: Job }) {
  const theme = useTheme();
  const router = useRouter();
  const { data: quotes } = useJobQuotes(job.id);
  const live = (quotes ?? []).filter((q) => q.status === 'submitted' || q.status === 'revised');
  if (!live.length) return null;
  const lowest = Math.min(...live.map((q) => q.total));
  const newest = live.reduce((a, b) => (a.created_at > b.created_at ? a : b));

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(routes.jobQuotes(job.id))}
      style={[styles.quotes, { borderColor: theme.border }]}>
        <View style={styles.stack}>
          {live.slice(0, 3).map((q, i) => (
            <View
              key={q.id}
              style={[styles.stackItem, { marginLeft: i ? -10 : 0, borderColor: theme.background }]}>
              <Avatar uri={q.provider?.avatar_url} name={q.provider?.name} size={32} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[Type.title, { color: theme.text }]}>
            {live.length} {live.length === 1 ? 'quote' : 'quotes'} for {job.title}
          </Text>
          <Text numberOfLines={1} style={[Type.caption, { color: theme.textSecondary }]}>
            From {formatMoney(lowest)} · newest {timeAgo(newest.created_at)}
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  onPhoto: { color: '#FFFFFF' },
  controlsRight: { flexDirection: 'row', gap: Spacing.two },
  body: { paddingHorizontal: Layout.gutter, paddingTop: Spacing.threeHalf, gap: Spacing.four },
  held: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  heldAmount: { fontSize: 28, lineHeight: 32, fontWeight: '600', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  quotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    paddingVertical: Spacing.three - 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stack: { flexDirection: 'row' },
  stackItem: { borderWidth: 2, borderRadius: Radius.pill },
  ask: { gap: Spacing.twoHalf },
  askField: {
    height: 54,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.threeHalf,
    paddingRight: 5,
  },
  askText: { flex: 1, fontSize: 17 },
  askGo: {
    height: 44,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.threeHalf,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askGoText: { fontSize: 15, fontWeight: '600' },
  trades: { paddingHorizontal: Layout.gutter, gap: Spacing.three + 2 },
  section: { gap: Spacing.twoHalf },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
