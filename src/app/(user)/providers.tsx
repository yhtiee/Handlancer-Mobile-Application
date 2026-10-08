import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProviderFilterSheet } from '@/components/providers/provider-filter-sheet';
import { ProviderResult } from '@/components/providers/provider-result';
import { TradeSheet } from '@/components/providers/trade-sheet';
import { Button, EmptyState, GlassButton, ListFooter, ListSkeleton, ScreenView, SearchField } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Categories } from '@/constants/categories';
import { Layout, Spacing, Type, TypeItalic } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useContentInset } from '@/hooks/use-insets';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTheme } from '@/hooks/use-theme';
import {
  countActiveProviderFilters,
  emptyProviderFilters,
  type ProviderFilters,
  type ProviderSort,
} from '@/lib/provider-filters';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useProviders, useProvidersCount } from '@/queries/use-providers';

/** What to call the people who do each trade, for the sentence. */
const PEOPLE: Record<string, string> = {
  plumbing: 'plumbers',
  electrical: 'electricians',
  carpentry: 'carpenters',
  painting: 'painters',
  cleaning: 'cleaners',
  appliance: 'appliance repairers',
  masonry: 'masons',
  ac: 'AC technicians',
  auto: 'mechanics',
  gardening: 'gardeners',
  moving: 'movers',
  other: 'other trades',
};

const SORTS: { value: ProviderSort; label: string }[] = [
  { value: 'rating', label: 'top rated first' },
  { value: 'experience', label: 'most experienced first' },
  { value: 'rate_low', label: 'cheapest first' },
  { value: 'newest', label: 'newest first' },
];

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Browse providers. The filters are a sentence — "Plumbers near Yaba, top
 * rated first" — and each underlined phrase is the control that changes it,
 * so what you are looking at and how to change it are the same words. The
 * results are portraits with the few facts that decide a shortlist.
 */
export default function ProvidersList() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useContentInset();
  const { profile } = useAuth();
  const { service } = useLocalSearchParams<{ service?: string }>();

  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState<ProviderFilters>(() => ({
    ...emptyProviderFilters,
    services: service && Categories.some((c) => c.id === service) ? [service] : [],
  }));
  const [tradesOpen, setTradesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // The field stays instant; the query only sees what the user settled on.
  const debouncedSearch = useDebouncedValue(search);
  const query = useProviders(debouncedSearch, filters);
  const { items: providers, onEndReached, loadingMore } = useInfiniteList(query);
  const { data: total } = useProvidersCount(debouncedSearch, filters);

  const myArea = profile?.location?.split(',')[0]?.trim();
  const area = filters.location.trim();
  const active = countActiveProviderFilters(filters);
  // "More filters" counts only what the sentence doesn't already say.
  const extra =
    active - (filters.services.length ? 1 : 0) - (area ? 1 : 0) - (filters.availableOnly ? 1 : 0);
  const narrowed = active > 0 || Boolean(debouncedSearch);

  const who =
    filters.services.length === 0
      ? 'Anyone'
      : filters.services.length === 1
        ? capitalise(PEOPLE[filters.services[0]] ?? 'providers')
        : filters.services.length === 2
          ? capitalise(`${PEOPLE[filters.services[0]]} and ${PEOPLE[filters.services[1]]}`)
          : `${filters.services.length} trades`;
  const sort = SORTS.find((s) => s.value === filters.sort) ?? SORTS[0];

  function cycleArea() {
    if (area) setFilters((f) => ({ ...f, location: '' }));
    else if (myArea) setFilters((f) => ({ ...f, location: myArea }));
    else setMoreOpen(true);
  }

  const header = (
    <View style={styles.header}>
      <Text style={[styles.sentence, { color: theme.text }]}>
        <Token onPress={() => setTradesOpen(true)}>{who}</Token>
        {area ? ' near ' : ', '}
        <Token onPress={cycleArea}>{area || 'anywhere'}</Token>
      </Text>

      <Text style={[Type.body, styles.meta, { color: theme.textSecondary }]}>
        {total == null ? 'Looking' : `${total} found`}
        {' · '}
        <Token
          small
          onPress={() =>
            setFilters((f) => ({
              ...f,
              sort: SORTS[(SORTS.findIndex((s) => s.value === f.sort) + 1) % SORTS.length].value,
            }))
          }>
          {sort.label}
        </Token>
        {' · '}
        <Token small onPress={() => setFilters((f) => ({ ...f, availableOnly: !f.availableOnly }))}>
          {filters.availableOnly ? 'available now' : 'available or not'}
        </Token>
        {' · '}
        <Token small onPress={() => setMoreOpen(true)}>
          {extra > 0 ? `${extra} more ${extra === 1 ? 'filter' : 'filters'}` : 'more filters'}
        </Token>
      </Text>

      {searching ? (
        <SearchField value={search} onChangeText={setSearch} placeholder="A name, a skill or an area" />
      ) : null}
    </View>
  );

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.toolbar, { paddingTop: insets.top + Spacing.one }]}>
        <GlassButton
          icon="chevron-back"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.userHome))}
        />
        <GlassButton
          icon={searching ? 'close' : 'search'}
          accessibilityLabel={searching ? 'Close search' : 'Search providers'}
          onPress={() => {
            if (searching) setSearch('');
            setSearching((v) => !v);
          }}
        />
      </View>

      <FlatList
        data={providers}
        keyExtractor={(item) => item.id}
        onRefresh={query.refetch}
        refreshing={query.isRefetching && !loadingMore}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={header}
        ListFooterComponent={<ListFooter loading={loadingMore} />}
        contentContainerStyle={{ paddingHorizontal: Layout.gutter, paddingBottom: bottomInset }}
        renderItem={({ item }) => <ProviderResult provider={item} />}
        ListEmptyComponent={
          query.isLoading ? (
            <ListSkeleton />
          ) : (
            <View style={{ gap: Spacing.three }}>
              <EmptyState
                icon={narrowed ? 'filter' : 'people-outline'}
                title={narrowed ? 'Nobody matches that' : 'No providers yet'}
                description={
                  narrowed
                    ? 'Try another trade, anywhere instead of one area, or fewer filters.'
                    : 'Tradespeople will show up here as they join Handlancer.'
                }
              />
              {narrowed ? (
                <Button
                  title="Show everyone"
                  variant="secondary"
                  onPress={() => {
                    setSearch('');
                    setFilters(emptyProviderFilters);
                  }}
                />
              ) : null}
            </View>
          )
        }
      />

      <TradeSheet
        visible={tradesOpen}
        value={filters.services}
        onClose={() => setTradesOpen(false)}
        onApply={(services) => setFilters((f) => ({ ...f, services }))}
      />
      <ProviderFilterSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        value={filters}
        onApply={setFilters}
        search={debouncedSearch}
      />
    </ScreenView>
  );
}

/** An underlined phrase in the filter sentence that changes what it says. */
function Token({ children, onPress, small }: { children: React.ReactNode; onPress: () => void; small?: boolean }) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="button"
      onPress={onPress}
      suppressHighlighting
      style={[
        small ? styles.tokenSmall : TypeItalic,
        {
          color: theme.text,
          textDecorationLine: 'underline',
          textDecorationColor: theme.textSecondary,
        },
      ]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  header: { gap: Spacing.twoHalf, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  sentence: { ...Type.serif, fontSize: 36, lineHeight: 42 },
  meta: { lineHeight: 24 },
  tokenSmall: { fontWeight: '600' },
});
