import type { Ref } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { FontFamily } from '@/constants/theme';

type Weight = 400 | 500 | 600 | 700;

function toWeight(w: TextStyle['fontWeight']): Weight | undefined {
  if (w == null) return undefined;
  if (w === 'bold') return 700;
  if (w === 'normal') return 400;
  const n = typeof w === 'number' ? w : parseInt(w, 10);
  if (Number.isNaN(n)) return undefined;
  if (n <= 400) return 400;
  if (n >= 700) return 700;
  return n as Weight;
}

/** The weight encoded in a bundled family name, e.g. "InstrumentSans_600SemiBold" → 600. */
function weightOfFamily(family: string): Weight | undefined {
  const m = /_(\d00)/.exec(family);
  return m ? toWeight(m[1] as TextStyle['fontWeight']) : undefined;
}

/**
 * Resolve `fontWeight`/`fontStyle` onto the bundled per-weight families.
 * Runtime-loaded fonts ignore `fontWeight` on Android, and on iOS a weight the
 * family lacks falls back to the system font, so the weight has to live in the
 * family name. Styles with another family (monospace, system) pass through.
 */
export function resolveFont(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const family = flat.fontFamily;
  const isText = !family || family.startsWith('InstrumentSans');
  const isDisplay = !!family && family.startsWith('Newsreader');
  if (!isText && !isDisplay) return style;

  const weight = toWeight(flat.fontWeight) ?? (family ? weightOfFamily(family) : undefined) ?? 400;
  let fontFamily: string;
  if (isDisplay) {
    const italic = flat.fontStyle === 'italic' || family!.includes('Italic');
    fontFamily = (italic ? FontFamily.displayItalic : FontFamily.display)[weight];
  } else {
    fontFamily = FontFamily.text[weight];
  }
  return [style, { fontFamily, fontWeight: 'normal', fontStyle: 'normal' }];
}

/** App text: Instrument Sans by default, Newsreader when a serif `Type` step asks for it. */
export function Text({ style, ...rest }: TextProps) {
  return <RNText style={resolveFont(style)} {...rest} />;
}

export function TextInput({ style, ref, ...rest }: TextInputProps & { ref?: Ref<RNTextInput> }) {
  return <RNTextInput ref={ref} style={resolveFont(style)} {...rest} />;
}
