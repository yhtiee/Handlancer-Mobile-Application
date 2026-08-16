import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaViewer } from '@/components/media/media-viewer';
import { Icon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { JobMedia } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

export function MediaThumb({
  item,
  size = 96,
  onPress,
}: {
  item: JobMedia;
  size?: number;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const content = (
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

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel="Open media full screen"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {content}
    </Pressable>
  );
}

/**
 * Before/after gallery for a single job. Tapping any thumbnail opens the
 * full-screen viewer at that item, with the whole set swipeable.
 */
export function MediaGallery({ media }: { media: JobMedia[] }) {
  const theme = useTheme();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  if (!media.length) return null;

  // Viewer order must match what is on screen, so build the flat list the same
  // way the sections render it — otherwise tapping opens the wrong photo.
  const ordered = [
    ...media.filter((m) => m.phase === 'before'),
    ...media.filter((m) => m.phase === 'after'),
  ];

  return (
    <View style={{ gap: Spacing.three }}>
      {(['before', 'after'] as const).map((phase) => {
        const items = ordered.filter((m) => m.phase === phase);
        if (!items.length) return null;
        return (
          <View key={phase} style={{ gap: Spacing.two }}>
            <Text style={[styles.phaseLabel, { color: theme.textSecondary }]}>
              {phase === 'before' ? 'Before' : 'After'}
            </Text>
            <View style={styles.row}>
              {items.map((m) => (
                <MediaThumb
                  key={m.id}
                  item={m}
                  onPress={() => setViewerIndex(ordered.findIndex((x) => x.id === m.id))}
                />
              ))}
            </View>
          </View>
        );
      })}

      <MediaViewer
        media={ordered}
        startIndex={viewerIndex ?? 0}
        visible={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

/** Flat grid of a provider's work (résumé). */
export function MediaGrid({ media }: { media: JobMedia[] }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  if (!media.length) return null;

  return (
    <View style={styles.row}>
      {media.map((m, i) => (
        <MediaThumb key={m.id} item={m} size={104} onPress={() => setViewerIndex(i)} />
      ))}
      <MediaViewer
        media={media}
        startIndex={viewerIndex ?? 0}
        visible={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
      />
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
