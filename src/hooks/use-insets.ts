import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, TabBarHeight } from '@/constants/theme';

/**
 * Bottom padding for scrollable content inside a TAB screen, so the last row
 * clears the tab bar instead of sitting under it.
 *
 * The bar occupies `TabBarHeight` PLUS the bottom safe-area inset it pads itself
 * with. That inset is 0 on hardware-button Android but non-zero with gesture
 * navigation and on iOS, so a hardcoded constant clips the last row on some
 * devices and over-pads on others.
 */
export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  return TabBarHeight + insets.bottom + Spacing.four;
}

/**
 * Bottom padding for scrollable content on a PUSHED screen — no tab bar to
 * clear, just the system gesture area.
 */
export function useContentInset() {
  const insets = useSafeAreaInsets();
  return insets.bottom + Spacing.four;
}
