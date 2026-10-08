import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * iOS-style content switcher / segmented control. Cross-platform (plain Views),
 * with a sliding active segment that carries a subtle elevation.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  /** `count` is shown after the label; leave it undefined while it loads. */
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active && process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
              onChange(opt.value);
            }}
            style={[
              styles.segment,
              active && { backgroundColor: theme.background, boxShadow: Elevation.sm },
            ]}>
            <Text
              numberOfLines={1}
              style={[styles.label, { color: active ? theme.text : theme.textSecondary }]}>
              {opt.label}
              {opt.count != null ? (
                <Text style={[styles.count, { color: theme.textSecondary }]}>
                  {' '}
                  {opt.count > 999 ? `${Math.floor(opt.count / 1000)}k+` : opt.count}
                </Text>
              ) : null}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15, fontWeight: '600' },
  count: { fontWeight: '500', fontVariant: ['tabular-nums'] },
});
