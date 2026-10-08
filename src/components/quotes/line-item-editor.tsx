import { Pressable, StyleSheet, View } from 'react-native';

import { formatMoney, Icon } from '@/components/ui';
import { Text, TextInput } from '@/components/ui/text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { QuoteLineItem } from '@/services/database.types';

type Kind = QuoteLineItem['type'];

const SECTIONS: { type: Kind; title: string; hint: string; placeholder: string; add: string }[] = [
  {
    type: 'labor',
    title: 'Labour',
    hint: 'Your work. Paid when the client approves the finished job.',
    placeholder: 'e.g. Replace the trap and reseal',
    add: 'Add labour',
  },
  {
    type: 'material',
    title: 'Materials',
    hint: 'Parts you buy. Paid to you early, so you can buy them.',
    placeholder: 'e.g. P-trap and washers',
    add: 'Add a material',
  },
];

/**
 * A quote as two plain lists — labour, then materials — because that split is
 * what the escrow pays out on (materials early, labour on approval). Each line
 * is a description and an amount; nothing to toggle.
 */
export function LineItemEditor({
  items,
  onChange,
  showErrors = false,
}: {
  items: QuoteLineItem[];
  onChange: (items: QuoteLineItem[]) => void;
  /** Mark lines that have a description but no amount, or the reverse. */
  showErrors?: boolean;
}) {
  const update = (index: number, patch: Partial<QuoteLineItem>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = (type: Kind) => onChange([...items, { label: '', type, amount: 0 }]);

  return (
    <View style={{ gap: Spacing.five }}>
      {SECTIONS.map((section) => (
        <Section
          key={section.type}
          section={section}
          lines={items.map((item, index) => ({ item, index })).filter(({ item }) => item.type === section.type)}
          onUpdate={update}
          onRemove={remove}
          onAdd={() => add(section.type)}
          showErrors={showErrors}
        />
      ))}
    </View>
  );
}

function Section({
  section,
  lines,
  onUpdate,
  onRemove,
  onAdd,
  showErrors,
}: {
  section: (typeof SECTIONS)[number];
  lines: { item: QuoteLineItem; index: number }[];
  onUpdate: (index: number, patch: Partial<QuoteLineItem>) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  showErrors: boolean;
}) {
  const theme = useTheme();
  const subtotal = lines.reduce((s, { item }) => s + (item.amount || 0), 0);

  return (
    <View style={{ gap: Spacing.twoHalf }}>
      <View style={styles.head}>
        <Text style={[Type.h3, { color: theme.text, flex: 1 }]}>{section.title}</Text>
        {subtotal > 0 ? (
          <Text style={[Type.bodyMedium, styles.num, { color: theme.text }]}>{formatMoney(subtotal)}</Text>
        ) : null}
      </View>
      <Text style={[Type.caption, { color: theme.textSecondary, marginTop: -Spacing.one }]}>{section.hint}</Text>

      {lines.map(({ item, index }) => {
        const incomplete = showErrors && (!item.label.trim() !== !(item.amount > 0));
        return (
          <View
            key={index}
            style={[
              styles.line,
              { backgroundColor: theme.backgroundElement, borderColor: incomplete ? theme.danger : 'transparent' },
            ]}>
            <TextInput
              value={item.label}
              onChangeText={(t) => onUpdate(index, { label: t })}
              placeholder={section.placeholder}
              placeholderTextColor={theme.textSecondary}
              style={[styles.label, { color: theme.text }]}
            />
            <View style={[styles.amount, { borderLeftColor: theme.border }]}>
              <Text style={[Type.body, { color: theme.textSecondary }]}>₦</Text>
              <TextInput
                value={item.amount ? item.amount.toLocaleString() : ''}
                onChangeText={(t) => onUpdate(index, { amount: Number(t.replace(/[^0-9]/g, '')) || 0 })}
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                style={[styles.amountInput, { color: theme.text }]}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove this line"
              hitSlop={10}
              onPress={() => onRemove(index)}
              style={styles.remove}>
              <Icon name="close" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        );
      })}

      <Pressable accessibilityRole="button" onPress={onAdd} style={styles.add} hitSlop={6}>
        <Icon name="add" size={18} color={theme.text} />
        <Text style={[Type.bodyMedium, { color: theme.text }]}>{section.add}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  num: { fontVariant: ['tabular-nums'] },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    paddingLeft: Spacing.three,
  },
  label: { flex: 1, fontSize: 15, paddingVertical: Spacing.twoHalf },
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.twoHalf,
    marginLeft: Spacing.two,
  },
  amountInput: {
    width: 84,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: Spacing.twoHalf,
    fontVariant: ['tabular-nums'],
  },
  remove: { width: 40, height: 52, alignItems: 'center', justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2, alignSelf: 'flex-start', paddingVertical: Spacing.one },
});
