import { useQueries } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AttentionStrip,
  type AttentionItem,
  ProviderJobRow,
  ProviderQuoteRow,
} from '@/components/jobs/job-list-rows';
import { Button, EmptyState, ListFooter, ListSkeleton, ScreenView, SegmentedControl } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Layout, Spacing, Type } from '@/constants/theme';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTabBarInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';
import { providerNextStep } from '@/lib/job-state';
import { routes } from '@/lib/routes';
import { useProviderJobs, useProviderJobsCount } from '@/queries/use-jobs';
import { useMyQuotes, useMyQuotesCount } from '@/queries/use-quotes';
import type { Job } from '@/services/database.types';
import type { QuoteWithJob } from '@/services/quotes';
import { getEscrow } from '@/services/wallet';

type Segment = 'active' | 'quotes' | 'completed';

/** Most recent active jobs scanned for the "your move" strip. Bounded on purpose. */
const SCAN = 20;

/**
 * The provider's work. Segments with real counts — under way, quotes, paid —
 * each a paginated, virtualized list, so any group is one tap away at any
 * size. Above the list, a short strip of the newest things only you can do.
 */
export default function ProviderJobs() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarInset();

  const counts = {
    active: useProviderJobsCount('active').data,
    quotes: useMyQuotesCount().data,
    completed: useProviderJobsCount('completed').data,
  };
  const [chosen, setChosen] = useState<Segment | null>(null);
  const segment: Segment = chosen ?? (counts.active === 0 && (counts.quotes ?? 0) > 0 ? 'quotes' : 'active');

  const jobsQ = useProviderJobs(segment === 'completed' ? 'completed' : 'active');
  const quotesQ = useMyQuotes();
  const jobs = useInfiniteList(jobsQ);
  const quotes = useInfiniteList(quotesQ);
  const list = segment === 'quotes' ? quotes : jobs;
  const query = segment === 'quotes' ? quotesQ : jobsQ;
  const attention = useYourMove();

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Fixed: title and the segments ── */}
      <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]}>
        <Text style={[Type.serifTitle, { color: theme.text }]}>Jobs</Text>
        <SegmentedControl
          value={segment}
          onChange={setChosen}
          options={[
            { value: 'active', label: 'Under way', count: counts.active },
            { value: 'quotes', label: 'Quotes', count: counts.quotes },
            { value: 'completed', label: 'Paid', count: counts.completed },
          ]}
        />
      </View>

      <FlatList<Job | QuoteWithJob>
        data={list.items as (Job | QuoteWithJob)[]}
        keyExtractor={(item) => item.id}
        onRefresh={query.refetch}
        refreshing={query.isRefetching && !list.loadingMore}
        showsVerticalScrollIndicator={false}
        onEndReached={list.onEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          attention.length ? (
            <View style={styles.strip}>
              <AttentionStrip title="Your move" items={attention} />
            </View>
          ) : null
        }
        ListFooterComponent={<ListFooter loading={list.loadingMore} />}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            {segment === 'quotes' ? (
              <ProviderQuoteRow quote={item as QuoteWithJob} />
            ) : (
              <ProviderJobRow job={item as Job} />
            )}
          </View>
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <View style={styles.rowWrap}>
              <ListSkeleton />
            </View>
          ) : (
            <EmptyState
              icon={segment === 'quotes' ? 'document-text-outline' : segment === 'active' ? 'hammer-outline' : 'wallet-outline'}
              title={segment === 'quotes' ? 'No quotes yet' : segment === 'active' ? 'Nothing under way' : 'Nothing paid yet'}
              description={
                segment === 'quotes'
                  ? 'Quote on open jobs near you. Your quotes and where they stand show here.'
                  : segment === 'active'
                    ? 'When a client accepts your quote and pays into escrow, the job shows here.'
                    : 'Jobs you finish and get paid for are kept here.'
              }
              action={
                segment === 'completed' ? undefined : (
                  <Button title="Find work" onPress={() => router.navigate(routes.providerFindWork)} />
                )
              }
            />
          )
        }
      />
    </ScreenView>
  );
}

/** The newest active jobs where the next step is the provider's, from a bounded scan. */
function useYourMove(): AttentionItem[] {
  const active = useInfiniteList(useProviderJobs('active')).items.slice(0, SCAN) as Job[];
  const jobs = useMemo(() => active, [active]);
  const escrows = useQueries({
    queries: jobs.map((j) => ({ queryKey: ['escrow', j.id] as const, queryFn: () => getEscrow(j.id) })),
  });
  const items: AttentionItem[] = [];
  jobs.forEach((job, i) => {
    const step = providerNextStep(job, escrows[i]?.data);
    if (step.lane !== 'yours' || !step.action) return;
    items.push({
      key: job.id,
      title: job.title,
      headline: step.headline,
      label: step.action.label,
      money: step.action.money,
      href: routes.providerJobDetail(job.id),
    });
  });
  return items.slice(0, 10);
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: Layout.gutter, paddingBottom: Spacing.twoHalf, gap: Spacing.three },
  strip: { paddingTop: Spacing.two, paddingBottom: Spacing.three },
  rowWrap: { paddingHorizontal: Layout.gutter },
});
