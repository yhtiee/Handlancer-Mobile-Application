import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { ProviderCard } from '@/components/providers/provider-card';
import { ProviderFilterSheet } from '@/components/providers/provider-filter-sheet';
import {
  Button,
  EmptyState,
  Icon,
  ListFooter,
  ListSkeleton,
  ScreenView,
  SearchField,
} from '@/components/ui';
import { Categories, categoryLabel } from '@/constants/categories';
import { Layout, Radius, Spacing, Type } from '@/constants/theme';
import {
  countActiveProviderFilters,
  emptyProviderFilters,
  PROVIDER_SORT_LABELS,
  type ProviderFilters,
} from '@/lib/provider-filters';
import { useProviders, useProvidersCount } from '@/queries/use-providers';
import { useContentInset } from '@/hooks/use-insets';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTheme } from '@/hooks/use-theme';

export default function ProvidersList() {
  const theme = useTheme();
  const bottomInset = useContentInset();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ProviderFilters>(emptyProviderFilters);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The field stays instant; the query only sees what the user settled on.
  const debouncedSearch = useDebouncedValue(search);
  const query = useProviders(debouncedSearch, filters);
  const { items: providers, onEndReached, loadingMore } = useInfiniteList(query);
  const { data: total } = useProvidersCount(debouncedSearch, filters);

  const active = countActiveProviderFilters(filters);
  const narrowed = active > 0 || Boolean(debouncedSearch);

  function toggleService(id: string) {
    setFilters((f) => ({
      ...f,
      services: f.services.includes(id)
        ? f.services.filter((s) => s !== id)
        : [...f.services, id],
    }));
  }

  const chips = describeActive(filters);

  return (
    <ScreenView>
      <Stack.Screen options={{ title: 'Browse Providers', headerShown: true }} />

      <View style={styles.controls}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, skill, or area..."
        />

        <View style={styles.row}>
          {/* Pinned so it stays reachable however far the trades scroll. */}
          <Pressable
            onPress={() => setSheetOpen(true)}
            style={({ pressed }) => [
              styles.filterBtn,
              {
                backgroundColor: active ? theme.tint : theme.backgroundElement,
                borderColor: active ? theme.tint : theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Icon name="options" size={16} color={active ? theme.tintText : theme.text} />
            <Text style={[Type.callout, { color: active ? theme.tintText : theme.text }]}>
              Filters
            </Text>
            {active ? (
              <View style={[styles.badge, { backgroundColor: theme.tintText }]}>
                <Text style={[Type.micro, { color: theme.tint }]}>{active}</Text>
              </View>
            ) : null}
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trades}>
            {Categories.map((c) => {
              const selected = filters.services.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggleService(c.id)}
                  style={({ pressed }) => [
                    styles.trade,
                    {
                      backgroundColor: selected ? theme.tint + '1F' : theme.backgroundElement,
                      borderColor: selected ? theme.tint : 'transparent',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}>
                  <Icon
                    name={c.icon}
                    size={14}
                    color={selected ? theme.tint : theme.textSecondary}
                  />
                  <Text
                    style={[Type.callout, { color: selected ? theme.tint : theme.textSecondary }]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {chips.length ? (
          <Animated.View entering={FadeIn} layout={LinearTransition} style={styles.activeRow}>
            {chips.map((chip) => (
              <Pressable
                key={chip.key}
                onPress={() => setFilters((f) => ({ ...f, ...chip.clear }))}
                style={[styles.activeChip, { backgroundColor: theme.tint + '14' }]}>
                <Text style={[Type.caption, { color: theme.tint }]}>{chip.label}</Text>
                <Icon name="close" size={12} color={theme.tint} />
              </Pressable>
            ))}
            <Pressable onPress={() => setFilters(emptyProviderFilters)} style={styles.clearAll}>
              <Text style={[Type.caption, { color: theme.textSecondary }]}>Clear all</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Doubles as the section header — tells the customer whether a filter
            did what they expected before they scroll. */}
        <View style={styles.resultRow}>
          <Text style={[Type.h3, { color: theme.text }]}>
            {total == null
              ? 'Providers'
              : `${total} provider${total === 1 ? '' : 's'}`}
          </Text>
          <Text style={[Type.caption, { color: theme.textSecondary }]}>
            {PROVIDER_SORT_LABELS[filters.sort]}
          </Text>
        </View>
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
            <View style={{ gap: Spacing.three }}>
              <EmptyState
                icon={narrowed ? 'filter' : 'people-outline'}
                title={narrowed ? 'No providers match' : 'No providers yet'}
                description={
                  narrowed
                    ? 'Try removing a trade, lowering the minimum rating, or clearing the area.'
                    : 'Service providers will appear here as they join HandLancer.'
                }
              />
              {active > 0 ? (
                <Button
                  title="Clear all filters"
                  variant="secondary"
                  icon="close-circle"
                  onPress={() => setFilters(emptyProviderFilters)}
                />
              ) : null}
            </View>
          )
        }
      />

      <ProviderFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={filters}
        onApply={setFilters}
        search={debouncedSearch}
      />
    </ScreenView>
  );
}

type ActiveChip = { key: string; label: string; clear: Partial<ProviderFilters> };

/** Human-readable summary of each active filter, plus how to switch it off. */
function describeActive(f: ProviderFilters): ActiveChip[] {
  const chips: ActiveChip[] = [];

  for (const id of f.services) {
    chips.push({
      key: `svc-${id}`,
      label: categoryLabel(id),
      clear: { services: f.services.filter((s) => s !== id) },
    });
  }
  if (f.minRating != null) {
    chips.push({ key: 'rating', label: `${f.minRating}★ & up`, clear: { minRating: null } });
  }
  if (f.minExperience != null) {
    chips.push({
      key: 'exp',
      label: `${f.minExperience}+ yrs`,
      clear: { minExperience: null },
    });
  }
  if (f.maxRate != null) {
    chips.push({ key: 'rate', label: `≤ ₦${f.maxRate.toLocaleString()}/hr`, clear: { maxRate: null } });
  }
  if (f.location.trim()) {
    chips.push({ key: 'loc', label: f.location.trim(), clear: { location: '' } });
  }
  if (f.verifiedOnly) {
    chips.push({ key: 'verified', label: 'Verified', clear: { verifiedOnly: false } });
  }
  if (f.availableOnly) {
    chips.push({ key: 'available', label: 'Available now', clear: { availableOnly: false } });
  }
  if (f.sort !== 'rating') {
    chips.push({ key: 'sort', label: PROVIDER_SORT_LABELS[f.sort], clear: { sort: 'rating' } });
  }
  return chips;
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: Layout.gutter,
    paddingTop: Layout.headerGap,
    paddingBottom: Spacing.twoHalf,
    gap: Spacing.twoHalf,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trades: { gap: Spacing.two, paddingRight: Spacing.four },
  trade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  activeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  clearAll: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.one },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
});
