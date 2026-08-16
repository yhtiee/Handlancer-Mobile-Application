import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, useWindowDimensions, View } from 'react-native';

import { HeroBanner } from '@/components/home/hero-banner';
import { HomeHeader } from '@/components/home/home-header';
import { QuickActions } from '@/components/home/quick-actions';
import { SectionHeader } from '@/components/home/section-header';
import { ProviderCard } from '@/components/providers/provider-card';
import { EmptyState, ListSkeleton, ScreenView, SearchField } from '@/components/ui';
import { Layout } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useProviders } from '@/queries/use-providers';
import { useTabBarInset } from '@/hooks/use-insets';

export default function Discover() {
  const { profile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const bottomInset = useTabBarInset();
  const [search, setSearch] = useState('');
  const query = useProviders(search);
  const { items: providerList } = useInfiniteList(query);
  const isLoading = query.isLoading;

  // Real providers only. Padding this carousel with invented people made an
  // empty marketplace look populated, and tapping one led to a dead profile.
  const displayProviders = providerList.slice(0, 6);

  // Full content width inside the screen's horizontal padding.
  const fullCardWidth = width - Layout.gutter * 2;
  // Two cards in carousel: the lead card dominates and the next peeks ~28% off the edge.
  const providerCardWidth = Math.max(220, Math.round(fullCardWidth * 0.72));

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />
      <HomeHeader shell="user" name={profile?.name} location={profile?.location} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Layout.gutter,
          paddingTop: Layout.headerGap,
          paddingBottom: bottomInset,
          gap: Layout.sectionGap,
        }}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search a service" />

        <QuickActions
          primary={{
            icon: 'add-circle-outline',
            label: 'Post Job',
            hint: 'Create quote request',
            href: routes.postJob,
          }}
          secondary={{
            icon: 'wallet-outline',
            label: 'Wallet',
            hint: 'Fund & pay',
            href: routes.wallet('user'),
          }}
        />

        <HeroBanner
          title="Find the right artisan"
          subtitle="Browse through our verified professionals ready to work."
          ctaLabel="Browse providers"
          href={routes.browseProviders}
          bgImage="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop"
        />

        <View style={{ gap: Layout.listGap }}>
          <SectionHeader title="Near you" onPress={() => router.push(routes.browseProviders)} />
          {isLoading ? (
            <ListSkeleton />
          ) : providerList.length === 0 && !search ? (
            <EmptyState
              icon="people-outline"
              title="No providers yet"
              description="Service providers will appear here as they join."
            />
          ) : providerList.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No matches"
              description="Try a different name, skill or area."
            />
          ) : (
            <FlatList
              data={displayProviders}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={providerCardWidth + Layout.listGap}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: Layout.gutter, gap: Layout.listGap }}
              style={{ marginHorizontal: -Layout.gutter }}
              renderItem={({ item }) => (
                <ProviderCard provider={item} style={{ width: providerCardWidth }} />
              )}
            />
          )}
        </View>
      </ScrollView>
    </ScreenView>
  );
}
