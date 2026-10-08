import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProviderQuoteRow } from '@/components/jobs/job-list-rows';
import { EmptyState, GlassButton, ListFooter, ListSkeleton, ScreenView, SegmentedControl } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Layout, Spacing, Type } from '@/constants/theme';
import { useContentInset } from '@/hooks/use-insets';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTheme } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';
import { useMyQuotes, useMyQuotesCount } from '@/queries/use-quotes';
import type { QuoteStatus } from '@/services/database.types';

type Group = 'waiting' | 'accepted' | 'declined';

const STATUSES: Record<Group, QuoteStatus[]> = {
  waiting: ['submitted', 'revised'],
  accepted: ['approved'],
  declined: ['rejected'],
};

const EMPTY: Record<Group, { title: string; description: string }> = {
  waiting: { title: 'Nothing waiting', description: 'Quotes you send show here until the client decides.' },
  accepted: { title: 'None accepted yet', description: 'When a client accepts your quote, it moves here.' },
  declined: { title: 'Nothing declined', description: 'Quotes a client didn’t choose are kept here.' },
};

/**
 * The provider's quotes, by where they stand. Each group is filtered and
 * counted in Postgres, so the counts are exact and every list paginates.
 */
export default function Quotes() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useContentInset();
  const [group, setGroup] = useState<Group>('waiting');

  const counts = {
    waiting: useMyQuotesCount(STATUSES.waiting).data,
    accepted: useMyQuotesCount(STATUSES.accepted).data,
    declined: useMyQuotesCount(STATUSES.declined).data,
  };
  const query = useMyQuotes(STATUSES[group]);
  const { items, onEndReached, loadingMore } = useInfiniteList(query);

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.top, { paddingTop: insets.top + Spacing.one }]}>
        <GlassButton
          icon="chevron-back"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.providerFindWork))}
        />
        <Text style={[Type.serifTitle, { color: theme.text }]}>Your quotes</Text>
        <SegmentedControl
          value={group}
          onChange={setGroup}
          options={[
            { value: 'waiting', label: 'Waiting', count: counts.waiting },
            { value: 'accepted', label: 'Accepted', count: counts.accepted },
            { value: 'declined', label: 'Not chosen', count: counts.declined },
          ]}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        onRefresh={query.refetch}
        refreshing={query.isRefetching && !loadingMore}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={<ListFooter loading={loadingMore} />}
        contentContainerStyle={{ paddingHorizontal: Layout.gutter, paddingBottom: bottomInset }}
        renderItem={({ item }) => <ProviderQuoteRow quote={item} />}
        ListEmptyComponent={query.isLoading ? <ListSkeleton /> : <EmptyState icon="document-text-outline" {...EMPTY[group]} />}
      />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: Layout.gutter, paddingBottom: Spacing.twoHalf, gap: Spacing.three, alignItems: 'stretch' },
});
