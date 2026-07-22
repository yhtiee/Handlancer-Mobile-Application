import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon, type IconName, MoneyText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { QuoteLineItem } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

export function LineItemEditor({
  items,
  onChange,
}: {
  items: QuoteLineItem[];
  onChange: (items: QuoteLineItem[]) => void;
}) {
  const theme = useTheme();
  const total = items.reduce((s, i) => s + (i.amount || 0), 0);

  function update(index: number, patch: Partial<QuoteLineItem>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function add(type: QuoteLineItem['type']) {
    onChange([...items, { label: '', type, amount: 0 }]);
  }

  return (
    <View style={{ gap: Spacing.two }}>
      {items.map((item, i) => (
        <Animated.View
          key={i}
          entering={FadeIn}
          exiting={FadeOut}
          layout={LinearTransition}
          style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
          <Pressable
            onPress={() => update(i, { type: item.type === 'material' ? 'labor' : 'material' })}
            style={[styles.typeToggle, { backgroundColor: theme.tint + '22' }]}>
            <Icon name={item.type === 'material' ? 'cube' : 'hammer'} size={16} color={theme.tint} />
          </Pressable>
          <TextInput
            value={item.label}
            onChangeText={(t) => update(i, { label: t })}
            placeholder={item.type === 'material' ? 'Material' : 'Labour'}
            placeholderTextColor={theme.textSecondary}
            style={[styles.labelInput, { color: theme.text }]}
          />
          <TextInput
            value={item.amount ? String(item.amount) : ''}
            onChangeText={(t) => update(i, { amount: Number(t.replace(/[^0-9.]/g, '')) || 0 })}
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            style={[styles.amountInput, { color: theme.text }]}
          />
          <Pressable onPress={() => remove(i)} hitSlop={8}>
            <Icon name="remove-circle" size={22} color={theme.danger} />
          </Pressable>
        </Animated.View>
      ))}

      <View style={styles.addRow}>
        <AddButton label="Add material" icon="cube" onPress={() => add('material')} />
        <AddButton label="Add labour" icon="hammer" onPress={() => add('labor')} />
      </View>

      <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
        <Text style={[styles.totalLabel, { color: theme.text }]}>Quote total</Text>
        <MoneyText amount={total} style={{ fontSize: 18 }} />
      </View>
    </View>
  );
}

function AddButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.addButton, { borderColor: theme.border }]}>
      <Icon name={icon} size={15} color={theme.tint} />
      <Text style={[styles.addText, { color: theme.tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  typeToggle: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelInput: { flex: 1, fontSize: 15, paddingVertical: Spacing.one },
  amountInput: {
    width: 80,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  addRow: { flexDirection: 'row', gap: Spacing.two },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addText: { fontSize: 14, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontSize: 16, fontWeight: '700' },
});
