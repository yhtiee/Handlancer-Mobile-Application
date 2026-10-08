import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Ionicons name, e.g. "add" or "send". */
  icon?: IconName;
  /** Override the label/icon colour, for buttons that sit on a photo. */
  labelColor?: string;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  labelColor,
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.tint, fg: theme.tintText },
    secondary: { bg: theme.backgroundElement, fg: theme.text },
    ghost: { bg: 'transparent', fg: theme.text },
    destructive: { bg: theme.danger, fg: '#ffffff' },
  };
  const c = { ...palette[variant], ...(labelColor ? { fg: labelColor } : null) };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={(e) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(e);
      }}
      style={(state) => [
        styles.base,
        size === 'lg' && styles.lg,
        {
          backgroundColor: c.bg,
          borderColor: c.border ?? 'transparent',
          borderWidth: c.border ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled ? 0.5 : state.pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={18} color={c.fg} /> : null}
          <Text style={[styles.label, size === 'lg' && styles.labelLg, { color: c.fg }]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lg: {
    height: 54,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  icon: {
    width: 18,
    height: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  labelLg: {
    fontSize: 17,
  },
});
