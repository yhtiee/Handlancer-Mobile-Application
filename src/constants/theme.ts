/**
 * Design tokens. The direction behind them lives in design/redesign/DIRECTION.md:
 * the person doing the job leads the screen, and escrow is drawn as a tape measure.
 *
 * Colour hex values are fixed brand values. What changed in the redesign is
 * their roles: `tint` means "money or work in motion" (the tape, Post, Accept,
 * Fund, Release, the selected tab) and nothing else; `accent` (navy) is display
 * ink and the hue of photo scrims.
 */

import '@/global.css';

import type { TextStyle } from 'react-native';

/** Tabular figures for anything that counts or sits in a column. */
const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

export const Colors = {
  light: {
    text: '#10151B',
    background: '#FBFCFD',
    backgroundElement: '#F1F4F6',
    backgroundSelected: '#E4E9EC',
    textSecondary: '#5B6772',
    border: '#E5E9EC',
    tint: '#0FB5A4',
    /** Ink, not white: white on #0FB5A4 is 2.57:1 and fails contrast. */
    tintText: '#10151B',
    success: '#16A34A',
    warning: '#C77700',
    danger: '#E5484D',
    /** Deep brand navy: display ink, photo scrims, the splash. */
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

/** The navy-black every photo scrim is mixed from, so type on photos sits in the workwear's hue. */
export const Scrim = '10, 18, 32';

/** Border radii. Pair with `{ borderCurve: 'continuous' }` on rounded rects. */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  /** Sheets and the floating tab bar. */
  xxl: 28,
  pill: 999,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Bundled families (loaded in the root layout with `useFonts`). On Android a
 * runtime-loaded font ignores `fontWeight`, so every weight is its own family;
 * `Text` from `@/components/ui/text` maps `fontWeight` onto these for you.
 */
export const FontFamily = {
  text: {
    400: 'InstrumentSans_400Regular',
    500: 'InstrumentSans_500Medium',
    600: 'InstrumentSans_600SemiBold',
    700: 'InstrumentSans_700Bold',
  },
  display: {
    400: 'Newsreader_400Regular',
    500: 'Newsreader_500Medium',
    600: 'Newsreader_600SemiBold',
    700: 'Newsreader_700Bold',
  },
  displayItalic: {
    400: 'Newsreader_400Regular_Italic',
    500: 'Newsreader_500Medium_Italic',
    600: 'Newsreader_600SemiBold_Italic',
    700: 'Newsreader_700Bold_Italic',
  },
} as const;


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
 * Typographic scale: Newsreader for the screen's sentence and titles,
 * Instrument Sans for everything else, tabular figures for money. Seven real
 * steps (48 / 40 / 28 / 17 / 15 / 13 / 11); the older names map onto them.
 * Spread onto a `<Text>` style, e.g. `style={[Type.h2, { color: theme.text }]}`.
 */
export const Type = {
  /** The one money figure on a screen. */
  amount: { fontFamily: FontFamily.text[600], fontSize: 48, lineHeight: 52, letterSpacing: -1.5, fontVariant: tabular },
  /** The screen's sentence, usually on a photo. Italicise the meaning word with `TypeItalic`. */
  serif: { fontFamily: FontFamily.display[500], fontSize: 40, lineHeight: 42, letterSpacing: -0.8 },
  /** Screen and sheet titles. */
  serifTitle: { fontFamily: FontFamily.display[500], fontSize: 28, lineHeight: 32, letterSpacing: -0.4 },

  /** Big figures (balances, ratings). Same as `amount`. */
  display: { fontFamily: FontFamily.text[600], fontSize: 48, lineHeight: 52, letterSpacing: -1.5, fontVariant: tabular },
  h1: { fontFamily: FontFamily.display[500], fontSize: 28, lineHeight: 32, letterSpacing: -0.4 },
  h2: { fontFamily: FontFamily.display[500], fontSize: 28, lineHeight: 32, letterSpacing: -0.4 },
  h3: { fontFamily: FontFamily.text[600], fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  title: { fontFamily: FontFamily.text[600], fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: FontFamily.text[400], fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: FontFamily.text[600], fontSize: 15, lineHeight: 21 },
  callout: { fontFamily: FontFamily.text[500], fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: FontFamily.text[500], fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: FontFamily.text[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.3 },
} as const;

/** The italic partner of a serif step, for the one word that carries the meaning. */
export const TypeItalic = { fontFamily: FontFamily.displayItalic[500] } as const;

/**
 * Elevation as CSS `boxShadow` strings (cross-platform on the New Arch — never
 * use legacy RN `shadow*`/`elevation`). Content sits flat; shadows belong to
 * the floating layer only (tab bar, sheets, toasts).
 */
export const Elevation = {
  none: 'none',
  sm: '0 1px 3px rgba(16, 21, 27, 0.06)',
  md: '0 6px 16px rgba(16, 21, 27, 0.08)',
  lg: '0 14px 32px rgba(16, 21, 27, 0.12)',
} as const;



/**
 * Screen scaffolding. Every screen composes from these rather than picking
 * paddings ad hoc — that is what keeps Home, Find Work and My Jobs on the same
 * rhythm. Change a value here and it moves everywhere, which is the point.
 */
export const Layout = {
  /** Horizontal gutter for all screen content. */
  gutter: Spacing.threeHalf,
  /** Space between a header and the content below it. */
  headerGap: Spacing.three,
  /** Space between cards/rows within a list. */
  listGap: Spacing.twoHalf,
  /** Space between major sections on a screen. */
  sectionGap: Spacing.five,
  /** Space above a screen header's content, added to the top safe-area inset. */
  headerTop: Spacing.three,
} as const;
