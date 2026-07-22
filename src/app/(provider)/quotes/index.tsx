import { Stack } from 'expo-router';
import { FlatList } from 'react-native';

import { MyQuoteCard } from '@/components/quotes/my-quote-card';
import { EmptyState, GlobalLoader, ListFooter, ScreenView } from '@/components/ui';
import { Layout } from '@/constants/theme';
import { useMyQuotes } from '@/queries/use-quotes';
import { useContentInset } from '@/hooks/use-insets';
import { useInfiniteList } from '@/hooks/use-infinite-list';

export default function Quotes() {
  const bottomInset = useContentInset();
  const query = useMyQuotes();
  const { items: quotes, onEndReached, loadingMore } = useInfiniteList(query);

  return (
    <ScreenView>
      <Stack.Screen options={{ title: 'My Quotes' }} />
      {query.isLoading ? (
        <GlobalLoader backgroundColor="transparent" />
      ) : (
        <FlatList
          data={quotes}
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
          renderItem={({ item }) => <MyQuoteCard quote={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No quotes yet"
              description="Apply to a job from Find Work and your submitted quotes will show here."
            />
          }
        />
      )}
    </ScreenView>
  );
}
