import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatMoney } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { providerImageFallback } from '@/lib/provider-images';
import { routes } from '@/lib/routes';
import type { Profile } from '@/services/database.types';

const AVAILABLE: Partial<Record<NonNullable<Profile['availability']>, string>> = {
  available: 'Available now',
  on_call: 'On call',
  busy: 'Busy this week',
};

/**
 * A provider in a browse result: a tall workshop portrait beside the few facts
 * that decide a shortlist — trade and area, experience and rating, whether
 * they can come, and what they charge.
 */
export function ProviderResult({ provider }: { provider: Profile }) {
  const theme = useTheme();
  const router = useRouter();
  const rated = (provider.rating ?? 0) > 0;
  const years = provider.years_experience;
  const where = [provider.services?.[0], provider.location].filter(Boolean).join(' · ');
  const record = [
    rated ? `${provider.rating.toFixed(1)} rating` : 'New',
    years ? `${years} ${years === 1 ? 'year' : 'years'}` : null,
    provider.is_verified ? 'ID verified' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const available = provider.availability ? AVAILABLE[provider.availability] : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(routes.providerProfile(provider.id))}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, opacity: pressed ? 0.75 : 1 }]}>
      <Image
        source={provider.avatar_url ?? providerImageFallback(provider)}
        style={[styles.photo, { backgroundColor: theme.backgroundElement }]}
        contentFit="cover"
        contentPosition="top"
        transition={150}
      />
      <View style={styles.body}>
        <Text numberOfLines={1} style={[Type.title, { color: theme.text }]}>
          {provider.name ?? 'Service provider'}
        </Text>
        {where ? (
          <Text numberOfLines={1} style={[Type.caption, { color: theme.textSecondary }]}>
            {where}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={[Type.caption, { color: theme.text }]}>
          {record}
        </Text>
        <View style={styles.foot}>
          {available ? (
            <View style={styles.avail}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: provider.availability === 'busy' ? theme.warning : theme.success },
                ]}
              />
              <Text style={[Type.caption, { color: theme.textSecondary }]}>{available}</Text>
            </View>
          ) : (
            <View />
          )}
          <Text style={[styles.price, { color: theme.text }]}>
            {provider.hourly_rate ? `${formatMoney(provider.hourly_rate)}/hr` : 'By quote'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three - 2,
    paddingVertical: Spacing.three - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  photo: { width: 88, height: 108, borderRadius: Radius.md, borderCurve: 'continuous' },
  body: { flex: 1, gap: 2, justifyContent: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.two },
  avail: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  price: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
