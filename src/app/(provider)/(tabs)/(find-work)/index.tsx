import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JobFilterBar } from '@/components/jobs/job-filter-bar';
import { JobFilterSheet } from '@/components/jobs/job-filter-sheet';
import { JobRow } from '@/components/jobs/job-row';
import {
  Button,
  EmptyState,
  formatMoney,
  GlassButton,
  Icon,
  ListFooter,
  ListSkeleton,
  PhotoHeader,
  ScreenView,
  SearchField,
} from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Layout, Spacing, Type, TypeItalic } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTabBarInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';
import {
  countActiveFilters,
  emptyJobFilters,
  type JobFilters,
  type JobSort,
  SORT_LABELS,
} from '@/lib/job-filters';
import { providerImageFallback } from '@/lib/provider-images';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useOpenJobs, useOpenJobsCount } from '@/queries/use-discover-jobs';
import { useUnreadCount } from '@/queries/use-notifications';
import { useWallet } from '@/queries/use-wallet';

const SORTS = Object.keys(SORT_LABELS) as JobSort[];

/**
 * Provider home. Leads with the provider at work and how much work is open
 * near them, then the jobs themselves, one per row with the budget aligned
 * right — the number a provider scans for.
 */
export default function FindWork() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const bottomInset = useTabBarInset();
  const unread = useUnreadCount();
  const { data: wallet } = useWallet();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<JobFilters>(emptyJobFilters);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The field stays instant; the query only sees what the user settled on.
  const debouncedSearch = useDebouncedValue(search);
  const query = useOpenJobs(debouncedSearch, filters);
  const { items: jobs, onEndReached, loadingMore } = useInfiniteList(query);
  const { data: total } = useOpenJobsCount(debouncedSearch, filters);

  const active = countActiveFilters(filters);
  // Once the provider is searching or filtering they came here to work, so the
  // photo steps aside and the results move up.
  const narrowed = active > 0 || Boolean(debouncedSearch);
  const area = profile?.location?.split(',')[0]?.trim();

  const controls = (
    <>
      <GlassButton
        onPhoto={!narrowed}
        icon="document-text-outline"
        label="My quotes"
        onPress={() => router.push(routes.providerQuotes)}
      />
      <View style={styles.controlsRight}>
        <GlassButton
          onPhoto={!narrowed}
          icon="wallet-outline"
          label={wallet ? formatMoney(wallet.balance, 'NGN', true) : undefined}
          accessibilityLabel="Wallet"
          onPress={() => router.push(routes.wallet('provider'))}
        />
        <GlassButton
          onPhoto={!narrowed}
          icon="notifications-outline"
          badge={unread}
          accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          onPress={() => router.push(routes.profileNotifications('provider'))}
        />
      </View>
    </>
  );

  const count = total == null ? null : `${total} ${total === 1 ? 'job' : 'jobs'}`;

  const listHeader = (
    <View>
      {narrowed ? (
        <View style={[styles.compact, { paddingTop: insets.top + Spacing.one }]}>{controls}</View>
      ) : (
        <PhotoHeader
          source={profile ? (profile.avatar_url ?? providerImageFallback(profile)) : null}
          contentPosition="top"
          heightRatio={0.38}
          eyebrow={[profile?.services?.[0], profile?.location].filter(Boolean).join(' · ') || undefined}
          controls={controls}>
          <Text style={[Type.serif, styles.onPhoto]}>
            {count ? `${count} open near ` : 'Open work near '}
            <Text style={TypeItalic}>{area || 'you'}.</Text>
          </Text>
        </PhotoHeader>
      )}

      {/* Search and filters sit directly on top of the results they narrow, so
          the effect of a keystroke is visible without scrolling back up. */}
      <View style={styles.tools}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search jobs, trades or areas" />
        <JobFilterBar filters={filters} onChange={setFilters} onOpenFilters={() => setSheetOpen(true)} />
        {/* Result count doubles as the section header — it tells the provider
            whether a filter did what they expected. */}
        <View style={styles.resultRow}>
          <Text style={[Type.caption, { color: theme.textSecondary }]}>
            {total == null ? 'Open jobs' : `${total} ${total === 1 ? 'result' : 'results'}`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sort: ${SORT_LABELS[filters.sort]}. Tap to change.`}
            hitSlop={10}
            onPress={() =>
              setFilters({
                ...filters,
                sort: SORTS[(SORTS.indexOf(filters.sort) + 1) % SORTS.length],
              })
            }
            style={styles.sort}>
            <Text style={[Type.caption, { color: theme.text, fontWeight: '600' }]}>
              {SORT_LABELS[filters.sort]}
            </Text>
            <Icon name="swap-vertical" size={14} color={theme.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={narrowed ? 'auto' : 'light'} />

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        onRefresh={query.refetch}
        refreshing={query.isRefetching && !loadingMore}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={listHeader}
        ListFooterComponent={<ListFooter loading={loadingMore} />}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <JobRow job={item} href={routes.findWorkJob(item.id)} />
          </View>
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <View style={styles.rowWrap}>
              <ListSkeleton />
            </View>
          ) : (
            <View style={[styles.rowWrap, { gap: Spacing.three }]}>
              <EmptyState
                icon={narrowed ? 'filter' : 'search'}
                title={narrowed ? 'Nothing matches' : 'No open jobs'}
                description={
                  narrowed
                    ? 'Try a wider budget, more trades, or clear the location.'
                    : 'New jobs and direct invites will show up here. Pull to refresh.'
                }
              />
              {/* The way out of an over-filtered dead end, right where they hit it. */}
              {active > 0 ? (
                <Button
                  title="Clear all filters"
                  variant="secondary"
                  onPress={() => setFilters(emptyJobFilters)}
                />
              ) : null}
            </View>
          )
        }
      />

      <JobFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={filters}
        onApply={setFilters}
        search={debouncedSearch}
      />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  onPhoto: { color: '#FFFFFF' },
  controlsRight: { flexDirection: 'row', gap: Spacing.two },
  compact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  tools: { paddingHorizontal: Layout.gutter, paddingTop: Spacing.three, gap: Spacing.twoHalf },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
  sort: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  rowWrap: { paddingHorizontal: Layout.gutter },
});
