import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { JobMedia } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

export function MediaThumb({ item, size = 96 }: { item: JobMedia; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.thumb,
        { width: size, height: size, backgroundColor: theme.backgroundSelected },
      ]}>
      <Image source={item.url} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      {item.kind === 'video' ? (
        <View style={styles.playOverlay}>
          <Icon name="play" size={18} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

/** Before/after gallery for a single job. */
export function MediaGallery({ media }: { media: JobMedia[] }) {
  const theme = useTheme();
  const before = media.filter((m) => m.phase === 'before');
  const after = media.filter((m) => m.phase === 'after');
  if (!media.length) return null;

  return (
    <View style={{ gap: Spacing.three }}>
      {(['before', 'after'] as const).map((phase) => {
        const items = phase === 'before' ? before : after;
        if (!items.length) return null;
        return (
          <View key={phase} style={{ gap: Spacing.two }}>
            <Text style={[styles.phaseLabel, { color: theme.textSecondary }]}>
              {phase === 'before' ? 'Before' : 'After'}
            </Text>
            <View style={styles.row}>
              {items.map((m) => (
                <MediaThumb key={m.id} item={m} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Flat grid of a provider's work (résumé). */
export function MediaGrid({ media }: { media: JobMedia[] }) {
  if (!media.length) return null;
  return (
    <View style={styles.row}>
      {media.map((m) => (
        <MediaThumb key={m.id} item={m} size={104} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumb: { borderRadius: Radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  phaseLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
