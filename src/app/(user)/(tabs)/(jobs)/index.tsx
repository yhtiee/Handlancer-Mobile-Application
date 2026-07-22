import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { JobCard } from '@/components/jobs/job-card';
import {
  Button,
  EmptyState,
  Icon,
  ListFooter,
  ListSkeleton,
  ScreenHeader,
  ScreenView,
  SegmentedControl,
} from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useMyJobs } from '@/queries/use-jobs';
import type { UserJobSegment } from '@/services/jobs';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTabBarInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';

const SEGMENTS: { value: UserJobSegment; label: string }[] = [
  { value: 'open', label: 'Open/Draft' },
  { value: 'active', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export default function Jobs() {
  const theme = useTheme();
  const bottomInset = useTabBarInset();
  const [segment, setSegment] = useState<UserJobSegment>('open');
  // Each segment is its own paginated query — the status filter runs in Postgres.
  const query = useMyJobs(segment);
  const { items: jobs, onEndReached, loadingMore } = useInfiniteList(query);

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="My Jobs"
        actions={
          <Link href={routes.postJob} asChild>
            <Pressable hitSlop={8}>
              <Icon name="add-circle" size={30} color={theme.tint} />
            </Pressable>
          </Link>
        }
      />

      <View style={{ paddingHorizontal: Layout.gutter, paddingTop: Spacing.two, paddingBottom: Spacing.two }}>
        <SegmentedControl options={SEGMENTS} value={segment} onChange={setSegment} />
      </View>

      {query.isLoading ? (
        <View style={{ paddingHorizontal: Layout.gutter, paddingTop: Layout.headerGap }}>
          <ListSkeleton />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          onRefresh={query.refetch}
          refreshing={query.isRefetching && !loadingMore}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={<ListFooter loading={loadingMore} />}
          contentContainerStyle={{
            paddingHorizontal: Layout.gutter,
            paddingTop: Layout.headerGap,
            paddingBottom: bottomInset,
            gap: Layout.listGap,
          }}
          renderItem={({ item }) => <JobCard job={item} />}
          ListEmptyComponent={
            segment === 'open' ? (
              <EmptyState
                icon="briefcase-outline"
                title="No open jobs"
                description="Post a job to invite providers to bid, or hire someone directly."
                action={
                  <Link href={routes.postJob} asChild>
                    <Button title="Post a job" icon="add" />
                  </Link>
                }
              />
            ) : segment === 'active' ? (
              <EmptyState
                icon="hammer"
                title="No active jobs"
                description="When you hire a provider and fund the contract, the job will appear here."
              />
            ) : (
              <EmptyState
                icon="checkmark-done-outline"
                title="No completed jobs"
                description="Finished or cancelled jobs will be archived here for reference."
              />
            )
          }
        />
      )}
    </ScreenView>
  );
}
