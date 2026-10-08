import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { Layout, Scrim, Spacing } from '@/constants/theme';

/**
 * The full-bleed workshop photo that leads a core screen, with a navy-black
 * scrim only where type sits (top, for the status bar and controls; bottom,
 * for the sentence). Height is a share of the screen so small phones keep
 * room for the content below.
 */
export function PhotoHeader({
  source,
  contentPosition,
  heightRatio = 0.46,
  eyebrow,
  controls,
  children,
}: {
  source: ImageSource | string | number | null | undefined;
  /** expo-image `contentPosition`, to keep the face and hands in frame. */
  contentPosition?: string;
  /** Share of the window height (0.46 on home, 0.34 on details). */
  heightRatio?: number;
  /** One quiet line above the sentence. */
  eyebrow?: string;
  /** The top control row (glass buttons). */
  controls?: ReactNode;
  /** The sentence or title, set by the screen. */
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <View style={[styles.wrap, { height: Math.round(height * heightRatio) }]}>
      {source ? (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={contentPosition as never}
          transition={200}
        />
      ) : null}
      <PhotoScrims />
      {controls ? <View style={[styles.controls, { top: insets.top + Spacing.one }]}>{controls}</View> : null}
      <View style={styles.over}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        {children}
      </View>
    </View>
  );
}

/**
 * Navy-black scrims for type on a photo: a short one at the top for the
 * status bar and controls, a deeper one at the bottom for the sentence.
 */
export function PhotoScrims({
  top = 150,
  bottom = '62%',
  strength = 0.84,
}: {
  top?: number;
  bottom?: `${number}%` | number;
  /** Opacity at the very bottom. */
  strength?: number;
}) {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[`rgba(${Scrim},0.62)`, `rgba(${Scrim},0)`]}
        style={[styles.scrimTop, { height: top }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[`rgba(${Scrim},0)`, `rgba(${Scrim},${strength * 0.66})`, `rgba(${Scrim},${strength})`]}
        locations={[0, 0.45, 1]}
        style={[styles.scrimBottom, { height: bottom }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden', backgroundColor: '#1E3A5F' },
  scrimTop: { position: 'absolute', left: 0, right: 0, top: 0 },
  scrimBottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  controls: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  over: { position: 'absolute', left: Layout.gutter, right: Layout.gutter, bottom: Spacing.threeHalf },
  eyebrow: {
    color: 'rgba(251,252,253,0.88)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
});
