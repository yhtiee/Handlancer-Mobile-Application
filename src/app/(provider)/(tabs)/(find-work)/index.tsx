import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { HeroBanner } from '@/components/home/hero-banner';
import { HomeHeader } from '@/components/home/home-header';
import { QuickActions } from '@/components/home/quick-actions';
import { SectionHeader } from '@/components/home/section-header';
import { JobCard } from '@/components/jobs/job-card';
import { EmptyState, ListFooter, ListSkeleton, ScreenView, SearchField } from '@/components/ui';
import { Layout } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useOpenJobs } from '@/queries/use-discover-jobs';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTabBarInset } from '@/hooks/use-insets';

export default function FindWork() {
  const { profile } = useAuth();
  const bottomInset = useTabBarInset();
  const [search, setSearch] = useState('');
  // The field stays instant; the query only sees what the user settled on.
  const debouncedSearch = useDebouncedValue(search);
  const query = useOpenJobs(debouncedSearch);
  const { items: jobs, onEndReached, loadingMore } = useInfiniteList(query);

  const listHeader = (
    <View style={{ gap: Layout.sectionGap, paddingBottom: Layout.sectionGap }}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search jobs" />

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

      <SectionHeader title="Open jobs" />
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
        contentContainerStyle={{
          paddingHorizontal: Layout.gutter,
          paddingTop: Layout.headerGap,
          paddingBottom: bottomInset,
          gap: Layout.listGap,
        }}
        renderItem={({ item }) => <JobCard job={item} href={routes.findWorkJob(item.id)} />}
        ListEmptyComponent={
          query.isLoading ? (
            <ListSkeleton />
          ) : (
            <EmptyState
              icon="search"
              title={debouncedSearch ? 'No matching jobs' : 'No open jobs'}
              description={
                debouncedSearch
                  ? 'Try a different search.'
                  : 'New jobs and direct invites will appear here. Pull to refresh.'
              }
            />
          )
        }
      />
    </ScreenView>
  );
}
