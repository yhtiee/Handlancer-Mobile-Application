import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle, View } from 'react-native';

import { Icon } from '@/components/ui';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { providerImageFallback } from '@/lib/provider-images';
import { routes } from '@/lib/routes';
import type { Profile } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

export function ProviderCard({
  provider,
  style,
}: {
  provider: Profile;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const [isFavorited, setIsFavorited] = useState(false);
  const primarySkill = provider.services?.[0] ?? 'General';
  const imageSource = provider.avatar_url ?? providerImageFallback(provider);

  const handleFavorite = (e: any) => {
    e.preventDefault();
    setIsFavorited(!isFavorited);
  };

  const reviewCount = provider.id === 'dummy-1'
    ? 200
    : provider.id === 'dummy-2'
    ? 120
    : Math.abs(provider.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 150 + 10;

  return (
    <Link href={routes.providerProfile(provider.id)} asChild>
      <Link.Trigger>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              opacity: pressed ? 0.92 : 1,
            },
            style,
          ]}>
          <View style={[styles.imageContainer, { backgroundColor: theme.backgroundElement }]}>
            <Image
              source={imageSource}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />

            <Pressable
              style={[styles.favoriteIcon, { backgroundColor: theme.background }]}
              onPress={handleFavorite}>
              <Icon
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={16}
                color={isFavorited ? '#E11D48' : theme.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
                {provider.name ?? 'Service Provider'}
              </Text>
              {(
                <View style={styles.rating}>
                  <Icon name="star" size={13} color={theme.warning} />
                  <Text style={[styles.ratingText, { color: theme.textSecondary }]}>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{provider.rating ? provider.rating.toFixed(1) : 4.7}</Text> ({reviewCount})
                  </Text>
                </View>
              )}
            </View>

            <Text numberOfLines={1} style={[styles.skill, { color: theme.textSecondary }]}>
              {primarySkill}
            </Text>

            <View style={styles.metaRow}>
              <Text numberOfLines={1} style={[styles.cta, { color: theme.tint }]}>
                View Profile
              </Text>
              {(
                <View style={styles.location}>
                  <Icon name="location-outline" size={13} color={theme.textSecondary} />
                  <Text
                    numberOfLines={1}
                    style={[styles.locationText, { color: theme.textSecondary }]}>
                    {provider.location ? provider.location : "24km"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: Spacing.two,
    boxShadow: Elevation.md,
  },
  imageContainer: {
    height: 132,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteIcon: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: Elevation.sm,
  },
  body: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.one,
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: { flex: 1, fontSize: 15, fontWeight: '800', lineHeight: 19 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },
  ratingText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  skill: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  metaRow: {
    marginTop: Spacing.one,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cta: { fontSize: 13, fontWeight: '800' },
  location: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half, flexShrink: 1 },
  locationText: { fontSize: 11, fontWeight: '600', maxWidth: 90 },
});
