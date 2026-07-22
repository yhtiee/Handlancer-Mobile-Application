/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#10151B',
    background: '#FBFCFD',
    backgroundElement: '#F1F4F6',
    backgroundSelected: '#E4E9EC',
    textSecondary: '#5B6772',
    border: '#E5E9EC',
    tint: '#0FB5A4',
    tintText: '#ffffff',
    success: '#16A34A',
    warning: '#C77700',
    danger: '#E5484D',
    /** Deep brand navy, for accents and the splash. */
    accent: '#1E3A5F',
  },
  dark: {
    text: '#F4F6F8',
    background: '#0E1116',
    backgroundElement: '#191D24',
    backgroundSelected: '#242932',
    textSecondary: '#9AA4B0',
    border: '#272D36',
    tint: '#2FD0BE',
    tintText: '#06201D',
    success: '#46C77E',
    warning: '#E2A03F',
    danger: '#FF6369',
    accent: '#7FB0E6',
  },
} as const;

/** Border radii. Pair with `{ borderCurve: 'continuous' }` on rounded rects. */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * 4pt spacing grid. Each `xHalf` step is the midpoint of the two steps around
 * it, so there is always a legal value between any two — reach for one of these
 * rather than inventing a number, which is how screens drift out of rhythm.
 */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  twoHalf: 12,
  three: 16,
  threeHalf: 20,
  four: 24,
  five: 32,
  fiveHalf: 48,
  six: 64,
} as const;

/**
 * Typographic scale. Spread onto a `<Text>` style for consistent sizing/weight
 * across the app, e.g. `style={[Type.h2, { color: theme.text }]}`.
 */
export const Type = {
  display: { fontSize: 32, fontWeight: '800', lineHeight: 38, letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: '800', lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  title: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  bodyMedium: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  callout: { fontSize: 14, fontWeight: '500', lineHeight: 19 },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 17 },
  micro: { fontSize: 11, fontWeight: '600', lineHeight: 14, letterSpacing: 0.3 },
} as const;

/**
 * Elevation as CSS `boxShadow` strings (cross-platform on the New Arch — never
 * use legacy RN `shadow*`/`elevation`). Apply via `boxShadow: Elevation.md`.
 */
export const Elevation = {
  none: 'none',
  sm: '0 1px 3px rgba(16, 21, 27, 0.06)',
  md: '0 6px 16px rgba(16, 21, 27, 0.08)',
  lg: '0 14px 32px rgba(16, 21, 27, 0.12)',
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/**
 * Height of the custom tab bar's own content, EXCLUDING the bottom safe-area
 * inset that the bar adds on top of it. Derived from the bar in
 * `(tabs)/_layout.tsx`: paddingTop 8 + button (30 pill + 3 gap + 14 label) +
 * paddingBottom 4. Never pad a tab screen's scroll content by this alone —
 * use `useTabBarInset()`, which adds the safe area.
 */
export const TabBarHeight = 60;
export const MaxContentWidth = 800;

/**
 * Screen scaffolding. Every screen composes from these rather than picking
 * paddings ad hoc — that is what keeps Home, Find Work and My Jobs on the same
 * rhythm. Change a value here and it moves everywhere, which is the point.
 */
export const Layout = {
  /** Horizontal gutter for all screen content. */
  gutter: Spacing.four,
  /** Space between a header and the content below it. */
  headerGap: Spacing.three,
  /** Space between cards/rows within a list. */
  listGap: Spacing.three,
  /** Space between major sections on a screen. */
  sectionGap: Spacing.five,
  /** Space above a screen header's content, added to the top safe-area inset. */
  headerTop: Spacing.three,
} as const;
