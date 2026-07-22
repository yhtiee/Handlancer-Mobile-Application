import * as Haptics from 'expo-haptics';
import type { Ref } from 'react';
import { Pressable, type PressableProps, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A single tab button for the custom `expo-router/ui` headless tab bar.
 * Used as the `asChild` target of a `<TabTrigger>`, which injects
 * `isFocused`, `onPress` and a `ref`. Renders an Ionicon (filled when active),
 * a tinted pill, and a label — cross-platform on iOS and Android.
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
  const color = isFocused ? theme.tint : theme.textSecondary;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ selected: !!isFocused }}
      onPress={(e) => {
        if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
        onPress?.(e);
      }}
      {...props}
      style={styles.item}>
      <View style={[styles.pill]}>
        <Icon name={isFocused ? iconFocused : icon} size={22} color={color} />
      </View>
      <Text numberOfLines={1} style={[styles.label, { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', gap: 3 },
  pill: {
    width: 56,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 11, fontWeight: '600' },
});
