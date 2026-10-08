import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/** Height of the floating tab capsule (see `components/ui/tab-bar.tsx`). */
const BAR = 62;

/**
 * Distance from the screen bottom to the floating tab bar: just above the home
 * indicator on gesture devices, a fixed 12pt on button-navigation Android.
 */
export function tabBarBottom(safeBottom: number) {
  return safeBottom > 0 ? Math.max(safeBottom - 12, Spacing.twoHalf) : Spacing.twoHalf;
}

/**
 * Bottom padding for scrollable content inside a TAB screen, so the last row
 * clears the tab bar instead of sitting under it.
 *
 * The bar floats `tabBarBottom()` above the screen edge, which depends on the
 * bottom safe-area inset (0 on hardware-button Android, non-zero with gesture
 * navigation and on iOS), so a hardcoded constant clips the last row on some
 * devices and over-pads on others.
 */
export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  return BAR + tabBarBottom(insets.bottom) + Spacing.four;
}

/**
 * Bottom padding for scrollable content on a PUSHED screen — no tab bar to
 * clear, just the system gesture area.
 */
export function useContentInset() {
  const insets = useSafeAreaInsets();
  return insets.bottom + Spacing.four;
}
