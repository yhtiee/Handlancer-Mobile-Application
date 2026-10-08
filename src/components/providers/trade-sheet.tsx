import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Categories } from '@/constants/categories';
import { Layout, Radius, Scrim, Spacing, Type, TypeItalic } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { categoryPhoto } from '@/lib/provider-images';

const COLUMNS = 3;

/**
 * Pick the trades to browse, as a wall of workshop photos rather than a list of
 * words. Several can be picked; an empty pick means every trade.
 */
export function TradeSheet({
  visible,
  value,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: string[];
  onClose: () => void;
  onApply: (services: string[]) => void;
}) {
  if (!visible) return null;
  return <TradeSheetBody value={value} onClose={onClose} onApply={onApply} />;
}

function TradeSheetBody({
  value,
  onClose,
  onApply,
}: {
  value: string[];
  onClose: () => void;
  onApply: (services: string[]) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [picked, setPicked] = useState<string[]>(value);
  const gap = Spacing.two;
  const tile = Math.floor((width - Layout.gutter * 2 - gap * (COLUMNS - 1)) / COLUMNS);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={[styles.grabber, { backgroundColor: theme.backgroundSelected }]} />
          <View style={styles.head}>
            <Text style={[Type.serifTitle, { color: theme.text, flex: 1 }]}>
              Who do you <Text style={TypeItalic}>need?</Text>
            </Text>
            {picked.length ? (
              <Pressable hitSlop={10} onPress={() => setPicked([])}>
                <Text style={[Type.bodyMedium, { color: theme.textSecondary }]}>Clear</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView contentContainerStyle={[styles.grid, { gap }]} showsVerticalScrollIndicator={false}>
            {Categories.map((c) => {
              const on = picked.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={c.label}
                  onPress={() => toggle(c.id)}
                  style={[
                    styles.tile,
                    { width: tile, height: Math.round(tile * 1.18), borderColor: on ? theme.text : 'transparent' },
                  ]}>
                  <Image source={categoryPhoto(c.id)} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
                  <LinearGradient
                    pointerEvents="none"
                    colors={[`rgba(${Scrim},0)`, `rgba(${Scrim},0.85)`]}
                    style={styles.tileScrim}
                  />
                  <Text numberOfLines={2} style={styles.tileLabel}>
                    {c.label}
                  </Text>
                  {on ? (
                    <View style={[styles.check, { backgroundColor: theme.background }]}>
                      <Icon name="checkmark" size={14} color={theme.text} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <Button
            title={picked.length ? `Show ${picked.length === 1 ? 'this trade' : `${picked.length} trades`}` : 'Show every trade'}
            size="lg"
            onPress={() => {
              onApply(picked);
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: `rgba(${Scrim},0.5)` },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderCurve: 'continuous',
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: Spacing.two },
  tile: {
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 2.5,
    justifyContent: 'flex-end',
  },
  tileScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  tileLabel: { color: '#FFFFFF', fontSize: 13, lineHeight: 17, fontWeight: '600', padding: Spacing.two },
  check: {
    position: 'absolute',
    top: Spacing.one + 2,
    right: Spacing.one + 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
