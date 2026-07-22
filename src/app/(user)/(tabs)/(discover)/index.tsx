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
import type { Profile } from '@/services/database.types';

export default function Discover() {
  const { profile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const bottomInset = useTabBarInset();
  const [search, setSearch] = useState('');
  const query = useProviders(search);
  const { items: providerList } = useInfiniteList(query);
  const isLoading = query.isLoading;

  // Get first two providers from server list
  const displayProviders = [...providerList].slice(0, 2);

  // If we don't have up to 2, include dummy providers
  const dummy1: Profile = {
    id: 'dummy-1',
    role: 'provider',
    name: 'Syeila Onstefen',
    avatar_url: null,
    phone: '+2348000000001',
    email: 'syeila.onstefen@example.com',
    bio: 'Experienced professional plumber.',
    location: '24 km',
    services: ['Plumber'],
    rating: 4.9,
    hourly_rate: 34,
    years_experience: 5,
    push_token: null,
    created_at: new Date().toISOString(),
  };

  const dummy2: Profile = {
    id: 'dummy-2',
    role: 'provider',
    name: 'Loka Madya',
    avatar_url: null,
    phone: '+2348000000002',
    email: 'loka.madya@example.com',
    bio: 'Dedicated home care professional.',
    location: '12 km',
    services: ['Plumber'],
    rating: 4.7,
    hourly_rate: 14,
    years_experience: 3,
    push_token: null,
    created_at: new Date().toISOString(),
  };

  if (displayProviders.length < 1) {
    displayProviders.push(dummy1);
  }
  if (displayProviders.length < 2) {
    displayProviders.push(dummy2);
  }

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
