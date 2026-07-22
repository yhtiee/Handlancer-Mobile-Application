import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { ProviderCard } from '@/components/providers/provider-card';
import { EmptyState, ListFooter, ListSkeleton, ScreenView, SearchField } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { useProviders } from '@/queries/use-providers';
import { useContentInset } from '@/hooks/use-insets';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useInfiniteList } from '@/hooks/use-infinite-list';

export default function ProvidersList() {
  const bottomInset = useContentInset();
  const [search, setSearch] = useState('');
  // The field stays instant; the query only sees what the user settled on.
  const debouncedSearch = useDebouncedValue(search);
  const query = useProviders(debouncedSearch);
  const { items: providers, onEndReached, loadingMore } = useInfiniteList(query);

  return (
    <ScreenView>
      <Stack.Screen options={{ title: 'Browse Providers', headerShown: true }} />

      <View style={{ paddingHorizontal: Layout.gutter, paddingTop: Layout.headerGap, paddingBottom: Spacing.two }}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, skill, or area..."
        />
      </View>

      <FlatList
        key="providers-grid-2"
        data={providers}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: Layout.listGap }}
        onRefresh={query.refetch}
        refreshing={query.isRefetching && !loadingMore}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={<ListFooter loading={loadingMore} />}
        contentContainerStyle={{
          paddingHorizontal: Layout.gutter,
          paddingBottom: bottomInset,
          gap: Layout.listGap,
        }}
        renderItem={({ item }) => <ProviderCard provider={item} style={{ flex: 1 }} />}
        ListEmptyComponent={
          query.isLoading ? (
            <ListSkeleton />
          ) : (
            <EmptyState
              icon="people-outline"
              title={debouncedSearch ? 'No matches found' : 'No providers available'}
              description="Try adjusting your search criteria."
            />
          )
        }
      />
    </ScreenView>
  );
}
