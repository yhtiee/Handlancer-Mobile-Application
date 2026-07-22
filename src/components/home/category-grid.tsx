import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import { Categories, type CategoryId } from '@/constants/categories';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Tappable grid of service categories (4 per row). */
export function CategoryGrid({
  selected,
  onSelect,
  limit,
}: {
  selected?: CategoryId | null;
  onSelect: (id: CategoryId) => void;
  limit?: number;
}) {
  const theme = useTheme();
  const items = limit ? Categories.slice(0, limit) : Categories;

  return (
    <View style={styles.grid}>
      {items.map((c) => {
        const active = selected === c.id;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.6 : 1 }]}>
            <View
              style={[
                styles.icon,
                { backgroundColor: active ? theme.tint : theme.tint + '18' },
              ]}>
              <Icon name={c.icon} size={24} color={active ? theme.tintText : theme.tint} />
            </View>
            <Text numberOfLines={1} style={[styles.label, { color: theme.textSecondary }]}>
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
  tile: { width: '25%', alignItems: 'center', gap: Spacing.one },
  icon: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 11, fontWeight: '600', textAlign: 'center', maxWidth: 72 },
});
