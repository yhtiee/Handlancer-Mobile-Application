import { type StyleProp, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = ViewProps & {
  /** Soft drop shadow. Defaults to true for a lifted, modern surface. */
  elevated?: boolean;
  padded?: boolean;
};

export function Card({ elevated = true, padded = true, style, ...rest }: CardProps) {
  const theme = useTheme();

  const base: StyleProp<ViewStyle> = {
    backgroundColor: theme.backgroundElement,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: padded ? Spacing.three : 0,
    ...(elevated ? { boxShadow: Elevation.sm } : null),
  };

  return <View style={[base, style]} {...rest} />;
}
