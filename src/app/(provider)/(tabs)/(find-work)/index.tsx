import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { HeroBanner } from '@/components/home/hero-banner';
import { HomeHeader } from '@/components/home/home-header';
import { QuickActions } from '@/components/home/quick-actions';
import { JobFilterBar } from '@/components/jobs/job-filter-bar';
import { JobGridCard } from '@/components/jobs/job-grid-card';
import { JobFilterSheet } from '@/components/jobs/job-filter-sheet';
import { Button, EmptyState, ListFooter, ListSkeleton, ScreenView, SearchField } from '@/components/ui';
import { Layout, Spacing, Type } from '@/constants/theme';
import { countActiveFilters, emptyJobFilters, SORT_LABELS, type JobFilters } from '@/lib/job-filters';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useOpenJobs, useOpenJobsCount } from '@/queries/use-discover-jobs';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTabBarInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';

export default function FindWork() {
  const theme = useTheme();
  const { profile } = useAuth();
  const bottomInset = useTabBarInset();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<JobFilters>(emptyJobFilters);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The field stays instant; the query only sees what the user settled on.
  const debouncedSearch = useDebouncedValue(search);
  const query = useOpenJobs(debouncedSearch, filters);
  const { items: jobs, onEndReached, loadingMore } = useInfiniteList(query);
  const { data: total } = useOpenJobsCount(debouncedSearch, filters);

  const active = countActiveFilters(filters);
  const narrowed = active > 0 || Boolean(debouncedSearch);

  const listHeader = (
    <View style={{ gap: Layout.listGap, paddingBottom: Layout.listGap }}>
      {/* Promos only when the provider is browsing. Once they are searching or
          filtering they came here to work, and these just push jobs down. */}
      {!narrowed ? (
        <View style={{ gap: Layout.listGap }}>
          <QuickActions
            primary={{
              icon: 'document-text-outline',
              label: 'My Quotes',
              hint: 'Track your bids',
              href: routes.providerQuotes,
            }}
            secondary={{
              icon: 'wallet-outline',
              label: 'Wallet',
              hint: 'Earnings & payouts',
              href: routes.wallet('provider'),
            }}
          />
          <HeroBanner
            title="Win more work"
            subtitle="A sharp profile and portfolio gets you hired faster."
            ctaLabel="Edit profile"
            href={routes.profileEdit('provider')}
            icon="ribbon"
            bgImage="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop"
          />
        </View>
      ) : null}

      {/* Search and filters sit directly on top of the results they narrow, so
          the effect of a keystroke is visible without scrolling back up. */}
      <View style={{ gap: Layout.listGap, paddingTop: narrowed ? 0 : Spacing.two }}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search jobs, trades or areas"
        />

        <JobFilterBar
          filters={filters}
          onChange={setFilters}
          onOpenFilters={() => setSheetOpen(true)}
        />
      </View>

      {/* Result count doubles as the section header — it tells the provider
          whether a filter did what they expected. */}
      <View style={styles.resultRow}>
        <Text style={[Type.h3, { color: theme.text }]}>
          {total == null
            ? 'Open jobs'
            : `${total} open job${total === 1 ? '' : 's'}`}
        </Text>
        <Text style={[Type.caption, { color: theme.textSecondary }]}>
          {SORT_LABELS[filters.sort]}
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />
      <HomeHeader shell="provider" name={profile?.name} location={profile?.location} />

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
        // Two-up: a provider comparing open jobs can see roughly twice as many
        // budgets per screen, which is the number they are actually scanning for.
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={{
          paddingHorizontal: Layout.gutter,
          paddingTop: Layout.headerGap,
          paddingBottom: bottomInset,
          gap: Layout.listGap,
        }}
        renderItem={({ item }) => (
          <JobGridCard job={item} href={routes.findWorkJob(item.id)} />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <ListSkeleton />
          ) : (
            <View style={{ gap: Spacing.three }}>
              <EmptyState
                icon={narrowed ? 'filter' : 'search'}
                title={narrowed ? 'No jobs match these filters' : 'No open jobs'}
                description={
                  narrowed
                    ? 'Try widening your budget range, adding trades, or clearing the location.'
                    : 'New jobs and direct invites will appear here. Pull to refresh.'
                }
              />
              {/* The way out of an over-filtered dead end, right where they hit it. */}
              {active > 0 ? (
                <Button
                  title="Clear all filters"
                  variant="secondary"
                  icon="close-circle"
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
  resultRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  // Cards are a fixed 48% wide, so `space-between` puts the gutter between them
  // and leaves a lone last card at its normal size rather than stretched.
  column: { justifyContent: 'space-between', alignItems: 'flex-start' },
});
