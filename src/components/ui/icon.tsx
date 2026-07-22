// Import the Ionicons component from the main package entry so TypeScript
// can resolve the module and its types correctly.
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * Cross-platform icon. Wraps Ionicons (`@expo/vector-icons`, bundled with Expo)
 * so icons render identically on iOS and Android — unlike SF Symbols, which are
 * iOS-only and show blank on Android. Use this everywhere instead of
 * `expo-image` `source="sf:…"`.
 */
export type IconName = keyof typeof Ionicons.glyphMap;

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={color ?? theme.text} />;
}
