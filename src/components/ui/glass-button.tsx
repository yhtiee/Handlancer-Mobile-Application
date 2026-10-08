import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Scrim, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The floating control layer: 44pt translucent circles and pills that sit over
 * content. `onPhoto` is for controls over a photo header (navy-black glass,
 * white ink); otherwise the glass is tinted from the ground.
 */
export function GlassButton({
  icon,
  label,
  onPress,
  onPhoto = false,
  badge,
  accessibilityLabel,
  style,
}: {
  icon?: IconName;
  label?: ReactNode;
  onPress?: () => void;
  onPhoto?: boolean;
  /** Unread count. Hidden at 0. */
  badge?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const ink = onPhoto ? '#FFFFFF' : theme.text;
  const fill = onPhoto ? `rgba(${Scrim}, 0.62)` : theme.backgroundElement + 'E6';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        label ? styles.pill : styles.circle,
        {
          backgroundColor: fill,
          borderColor: onPhoto ? 'rgba(255,255,255,0.14)' : theme.border,
          opacity: pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}>
      {icon ? <Icon name={icon} size={20} color={ink} /> : null}
      {label ? (
        <Text numberOfLines={1} style={[styles.label, { color: ink }]}>
          {label}
        </Text>
      ) : null}
      {badge ? (
        <View style={[styles.badge, { backgroundColor: onPhoto ? '#FBFCFD' : theme.text }]}>
          <Text style={[styles.badgeText, { color: onPhoto ? '#10151B' : theme.background }]}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
  },
  circle: { width: 44 },
  pill: { paddingHorizontal: Spacing.three },
  label: { fontSize: 15, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
