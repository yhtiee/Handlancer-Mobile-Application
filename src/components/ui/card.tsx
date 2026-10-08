import { type StyleProp, View, type ViewProps, type ViewStyle } from 'react-native';

import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = ViewProps & {
  /** Drop shadow, for surfaces that float over content. Content cards sit flat. */
  elevated?: boolean;
  padded?: boolean;
};

export function Card({ elevated = false, padded = true, style, ...rest }: CardProps) {
  const theme = useTheme();

  const base: StyleProp<ViewStyle> = {
    backgroundColor: theme.backgroundElement,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: padded ? Spacing.three : 0,
    ...(elevated ? { boxShadow: Elevation.sm } : null),
  };

  return <View style={[base, style]} {...rest} />;
}
