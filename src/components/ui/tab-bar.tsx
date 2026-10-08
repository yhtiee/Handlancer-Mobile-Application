import * as Haptics from 'expo-haptics';
import type { Ref } from 'react';
import { Pressable, type PressableProps, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { tabBarBottom } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';

/** Height of the floating capsule itself. */
export const TAB_BAR_HEIGHT = 62;

/**
 * Style for the `<TabList>` in each shell's `(tabs)/_layout`: a translucent
 * capsule floating above the content, which scrolls underneath it.
 */
export function useFloatingTabBarStyle(): ViewStyle {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  return {
    position: 'absolute',
    left: Spacing.threeHalf,
    right: Spacing.threeHalf,
    bottom: tabBarBottom(insets.bottom),
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    backgroundColor: dark ? 'rgba(25, 29, 36, 0.94)' : 'rgba(241, 244, 246, 0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    boxShadow: Elevation.md,
  };
}

/**
 * A single tab button for the custom `expo-router/ui` headless tab bar.
 * Used as the `asChild` target of a `<TabTrigger>`, which injects
 * `isFocused`, `onPress` and a `ref`. The selected tab sits on a teal-tinted
 * inner capsule; its glyph fills.
 */
export type TabButtonProps = Omit<PressableProps, 'children'> & {
  isFocused?: boolean;
  icon: IconName;
  iconFocused: IconName;
  label: string;
  ref?: Ref<View>;
};

export function TabButton({
  isFocused,
  icon,
  iconFocused,
  label,
  ref,
  onPress,
  ...props
}: TabButtonProps) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const color = isFocused ? (dark ? theme.tint : theme.text) : theme.textSecondary;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      onPress={(e) => {
        if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
        onPress?.(e);
      }}
      {...props}
      style={[styles.item, isFocused && { backgroundColor: theme.tint + '29' }]}>
      <Icon name={isFocused ? iconFocused : icon} size={22} color={color} />
      <Text numberOfLines={1} style={[styles.label, { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: { fontSize: 11, fontWeight: '600' },
});
