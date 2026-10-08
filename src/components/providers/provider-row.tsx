import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { providerImageFallback } from '@/lib/provider-images';
import { routes } from '@/lib/routes';
import type { Profile } from '@/services/database.types';

/**
 * A provider as a quiet row: their workshop portrait, name, and
 * trade · area · rating. No stars, no heart, no card. An unrated provider
 * says "New" — a made-up score would be a claim about a real person.
 */
export function ProviderRow({ provider }: { provider: Profile }) {
  const theme = useTheme();
  const router = useRouter();
  const rating = (provider.rating ?? 0) > 0 ? provider.rating.toFixed(1) : 'New';
  const meta = [provider.services?.[0], provider.location, rating].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(routes.providerProfile(provider.id))}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
        <Image
          source={provider.avatar_url ?? providerImageFallback(provider)}
          style={[styles.photo, { backgroundColor: theme.backgroundElement }]}
          contentFit="cover"
          contentPosition="top"
          transition={150}
        />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[Type.title, { color: theme.text }]}>
            {provider.name ?? 'Service provider'}
          </Text>
          <Text numberOfLines={1} style={[Type.caption, { color: theme.textSecondary }]}>
            {meta}
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.twoHalf, paddingVertical: Spacing.two },
  photo: { width: 52, height: 52, borderRadius: 26 },
});
