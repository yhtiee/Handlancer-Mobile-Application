import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** Graduation spacing; every fifth one is tall. */
const STEP = 8;

export type TapeMark = {
  /** Position along the tape, 0 to 1 (proportional to money). */
  at: number;
  /** Bold first line, usually an amount. */
  value?: string;
  /** Quiet second line. */
  label?: string;
};

/**
 * Escrow drawn as a tape-measure blade. The teal fill is money released, its
 * length proportional to the amount; the dark hook marks where it has reached.
 * When `progress` grows, the blade runs out to the new mark on a spring, with a
 * selection tick per tall graduation passed and a landing thud — the app's
 * signature moment (design/redesign/DIRECTION.md, "The tape runs out").
 *
 * Sizes: `hero` (44pt, job detail), `inline` (20pt, home), `row` (8pt, lists).
 */
export function Tape({
  progress,
  stops = [],
  marks,
  size = 'inline',
  style,
}: {
  progress: number;
  /** Stage boundaries drawn as full-height lines. */
  stops?: number[];
  /** Labels under the tape. */
  marks?: TapeMark[];
  size?: 'hero' | 'inline' | 'row';
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const height = size === 'hero' ? 44 : size === 'inline' ? 20 : 8;
  const graduated = size !== 'row';
  const clamped = Math.max(0, Math.min(1, progress));

  const fill = useSharedValue(clamped);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      fill.value = clamped;
      return;
    }
    if (reduceMotion) {
      fill.value = withTiming(clamped, { duration: 200, reduceMotion: ReduceMotion.Never });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    fill.value = withSpring(clamped, { duration: 500, dampingRatio: 0.72 }, (done) => {
      if (done) scheduleOnRN(land);
    });
  }, [clamped, fill, reduceMotion]);

  // One selection tick for each tall graduation the blade passes.
  const tallEvery = STEP * 5;
  useAnimatedReaction(
    () => (width ? Math.floor((fill.value * width) / tallEvery) : 0),
    (cur, prev) => {
      if (prev != null && cur > prev) scheduleOnRN(tick);
    },
    [width],
  );

  const bladeStyle = useAnimatedStyle(() => ({ width: fill.value * width }));
  const hookStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.max(0, fill.value * width - 5) }],
  }));

  const tickOn = dark ? theme.tintText : '#10151B';
  const tickOff = theme.textSecondary + '73';
  const ticks: number[] = [];
  if (graduated && width) for (let x = STEP; x < width - 2; x += STEP) ticks.push(x);

  return (
    <View style={style}>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
        style={[
          styles.track,
          { height, borderRadius: graduated ? 3 : height / 2, backgroundColor: theme.backgroundSelected },
        ]}>
        <Animated.View style={[styles.blade, { backgroundColor: theme.tint }, bladeStyle]} />
        {ticks.map((x, i) => {
          const tall = (i + 1) % 5 === 0;
          return (
            <View
              key={x}
              style={[
                styles.tick,
                {
                  left: x,
                  height: height * (tall ? 0.46 : 0.26),
                  backgroundColor: x < clamped * width ? tickOn : tickOff,
                },
              ]}
            />
          );
        })}
        {stops
          .filter((s) => s > 0 && s < 1)
          .map((s) => (
            <View
              key={s}
              style={[
                styles.stop,
                { left: s * width - 1, backgroundColor: s <= clamped ? tickOn : theme.textSecondary },
              ]}
            />
          ))}
      </View>
      {graduated ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.hook, { height: height + 10, backgroundColor: theme.text }, hookStyle]}
        />
      ) : null}
      {marks?.length ? (
        <View style={styles.marks}>
          {marks.map((m) => {
            const end = m.at >= 1;
            const mid = !end && m.at > 0.5;
            return (
              <View
                key={m.at}
                style={[
                  styles.mark,
                  end
                    ? { right: 0, alignItems: 'flex-end' }
                    : mid
                      ? { left: m.at * width, transform: [{ translateX: '-50%' }], alignItems: 'center' }
                      : { left: Math.max(0, m.at * width - 5) },
                ]}>
                {m.value ? (
                  <Text style={[styles.markValue, { color: theme.text }]}>{m.value}</Text>
                ) : null}
                {m.label ? (
                  <Text style={[styles.markLabel, { color: theme.textSecondary }]}>{m.label}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function tick() {
  Haptics.selectionAsync();
}

function land() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).then(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  blade: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  tick: { position: 'absolute', top: 0, width: 1.25 },
  stop: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  hook: { position: 'absolute', top: -5, left: 0, width: 10, borderRadius: 3, borderCurve: 'continuous' },
  marks: { height: 38, marginTop: Spacing.two },
  mark: { position: 'absolute', top: 0 },
  markValue: { fontSize: 13, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  markLabel: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
});
