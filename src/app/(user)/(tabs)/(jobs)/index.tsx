import { useQueries } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttentionStrip, type AttentionItem, ClientJobRow } from '@/components/jobs/job-list-rows';
import {
  Button,
  EmptyState,
  GlassButton,
  ListFooter,
  ListSkeleton,
  ScreenView,
  SegmentedControl,
} from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Layout, Spacing, Type } from '@/constants/theme';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTabBarInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';
import { jobNextStep } from '@/lib/job-state';
import { routes } from '@/lib/routes';
import { queryKeys } from '@/queries/keys';
import { useMyJobs, useMyJobsCount } from '@/queries/use-jobs';
import type { Job } from '@/services/database.types';
import type { UserJobSegment } from '@/services/jobs';
import { listQuotesForJob } from '@/services/quotes';
import { getEscrow } from '@/services/wallet';

/** Most recent jobs scanned for the "waiting on you" strip. Bounded on purpose. */
const SCAN = 20;

/**
 * The client's jobs. Segments with real counts keep every group one tap away
 * however many jobs there are; each segment is its own paginated, virtualized
 * list. Above the list, a short strip shows the newest things waiting on you.
 */
export default function Jobs() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarInset();

  const counts = {
    active: useMyJobsCount('active').data,
    open: useMyJobsCount('open').data,
    completed: useMyJobsCount('completed').data,
  };
  const [chosen, setChosen] = useState<UserJobSegment | null>(null);
  // Until the client picks, open on whatever has jobs: work under way first.
  const segment: UserJobSegment =
    chosen ?? (counts.active === 0 && (counts.open ?? 0) > 0 ? 'open' : 'active');

  const query = useMyJobs(segment);
  const { items, onEndReached, loadingMore } = useInfiniteList(query);
  const attention = useAttention();

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Fixed: title and the segments, never more than a glance away ── */}
      <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.titleRow}>
          <Text style={[Type.serifTitle, { color: theme.text, flex: 1 }]}>Jobs</Text>
          <GlassButton icon="add" label="Post a job" onPress={() => router.push(routes.postJob)} />
        </View>
        <SegmentedControl
          value={segment}
          onChange={setChosen}
          options={[
            { value: 'active', label: 'Under way', count: counts.active },
            { value: 'open', label: 'Open', count: counts.open },
            { value: 'completed', label: 'Done', count: counts.completed },
          ]}
        />
      </View>

      <FlatList
        data={items as Job[]}
        keyExtractor={(item) => item.id}
        onRefresh={query.refetch}
        refreshing={query.isRefetching && !loadingMore}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          attention.length ? (
            <View style={styles.strip}>
              <AttentionStrip title="Waiting on you" items={attention} />
            </View>
          ) : null
        }
        ListFooterComponent={<ListFooter loading={loadingMore} />}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <ClientJobRow job={item} />
          </View>
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <View style={styles.rowWrap}>
              <ListSkeleton />
            </View>
          ) : (
            <EmptyState
              icon={segment === 'active' ? 'hammer-outline' : segment === 'open' ? 'briefcase-outline' : 'checkmark-done-outline'}
              title={segment === 'active' ? 'Nothing under way' : segment === 'open' ? 'No open jobs' : 'Nothing finished yet'}
              description={
                segment === 'active'
                  ? 'When you hire someone and pay into escrow, the job shows here.'
                  : segment === 'open'
                    ? 'Post a job and providers nearby send you quotes.'
                    : 'Finished and cancelled jobs are kept here.'
              }
              action={
                segment === 'completed' ? undefined : (
                  <Button title="Post a job" icon="add" onPress={() => router.push(routes.postJob)} />
                )
              }
            />
          )
        }
      />
    </ScreenView>
  );
}

/**
 * The newest jobs that are waiting on the client, from the most recent page of
 * open and active jobs only — a bounded scan, so it stays cheap at any size.
 */
function useAttention(): AttentionItem[] {
  const open = useInfiniteList(useMyJobs('open')).items.slice(0, SCAN) as Job[];
  const active = useInfiniteList(useMyJobs('active')).items.slice(0, SCAN) as Job[];
  const jobs = useMemo(() => [...active, ...open], [active, open]);

  const escrows = useQueries({
    queries: jobs.map((j) => ({ queryKey: ['escrow', j.id] as const, queryFn: () => getEscrow(j.id) })),
  });
  const quotes = useQueries({
    queries: jobs.map((j) => ({
      queryKey: queryKeys.quotes.forJob(j.id),
      queryFn: () => listQuotesForJob(j.id),
      enabled: j.status !== 'in_progress',
    })),
  });

  const items: AttentionItem[] = [];
  jobs.forEach((job, i) => {
    const step = jobNextStep(job, escrows[i]?.data, quotes[i]?.data);
    if (step.lane !== 'needs' || !step.action) return;
    items.push({
      key: job.id,
      title: job.title,
      headline: step.headline,
      label: step.action.label,
      money: step.action.money,
      href: step.action.href,
    });
  });
  // Payments first: they hold up someone's work.
  return items.sort((a, b) => Number(!!b.money) - Number(!!a.money)).slice(0, 10);
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: Layout.gutter, paddingBottom: Spacing.twoHalf, gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  strip: { paddingTop: Spacing.two, paddingBottom: Spacing.three },
  rowWrap: { paddingHorizontal: Layout.gutter },
});
