import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { JobCard } from '@/components/jobs/job-card';
import { MyQuoteCard } from '@/components/quotes/my-quote-card';
import {
  EmptyState,
  ListFooter,
  ListSkeleton,
  ScreenHeader,
  ScreenView,
  SegmentedControl,
} from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useProviderJobs } from '@/queries/use-jobs';
import { useMyQuotes } from '@/queries/use-quotes';
import type { ProviderJobSegment } from '@/services/jobs';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTabBarInset } from '@/hooks/use-insets';

type Segment = 'quotes' | ProviderJobSegment;

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'quotes', label: 'Quotes' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export default function ProviderJobs() {
  const bottomInset = useTabBarInset();
  const [segment, setSegment] = useState<Segment>('quotes');

  // The jobs query always tracks a real job segment; on the Quotes tab it holds
  // "active" ready so switching to it is instant.
  const jobSegment: ProviderJobSegment = segment === 'completed' ? 'completed' : 'active';
  const jobsQ = useProviderJobs(jobSegment);
  const quotesQ = useMyQuotes();

  const jobsList = useInfiniteList(jobsQ);
  const quotesList = useInfiniteList(quotesQ);

  const isLoading = segment === 'quotes' ? quotesQ.isLoading : jobsQ.isLoading;

  const listContent = {
    paddingHorizontal: Layout.gutter,
    paddingTop: Layout.headerGap,
    paddingBottom: bottomInset,
    gap: Layout.listGap,
  };

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="My Jobs" />

      <View style={{ paddingHorizontal: Layout.gutter, paddingTop: Spacing.two, paddingBottom: Spacing.two }}>
        <SegmentedControl options={SEGMENTS} value={segment} onChange={setSegment} />
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: Layout.gutter, paddingTop: Layout.headerGap }}>
          <ListSkeleton />
        </View>
      ) : segment === 'quotes' ? (
        <FlatList
          data={quotesList.items}
          keyExtractor={(item) => item.id}
          onRefresh={quotesQ.refetch}
          refreshing={quotesQ.isRefetching && !quotesList.loadingMore}
          showsVerticalScrollIndicator={false}
          onEndReached={quotesList.onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={<ListFooter loading={quotesList.loadingMore} />}
          contentContainerStyle={listContent}
          renderItem={({ item }) => <MyQuoteCard quote={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No quotes yet"
              description="Apply to a job from Find Work and your submitted quotes will show here."
            />
          }
        />
      ) : (
        <FlatList
          data={jobsList.items}
          keyExtractor={(item) => item.id}
          onRefresh={jobsQ.refetch}
          refreshing={jobsQ.isRefetching && !jobsList.loadingMore}
          showsVerticalScrollIndicator={false}
          onEndReached={jobsList.onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={<ListFooter loading={jobsList.loadingMore} />}
          contentContainerStyle={listContent}
          renderItem={({ item }) => (
            <JobCard job={item} href={routes.providerJobDetail(item.id)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={segment === 'active' ? 'hammer' : 'checkmark-done-outline'}
              title={segment === 'active' ? 'No active jobs' : 'Nothing completed yet'}
              description={
                segment === 'active'
                  ? 'When a customer approves your quote, the job appears here to manage and submit proof of work.'
                  : 'Jobs you finish will be archived here with their reviews.'
              }
            />
          }
        />
      )}
    </ScreenView>
  );
}
