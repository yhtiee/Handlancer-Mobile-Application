import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui';
import { Categories, categoryLabel } from '@/constants/categories';
import { Radius, Spacing, Type } from '@/constants/theme';
import {
  countActiveFilters,
  emptyJobFilters,
  POSTED_OPTIONS,
  SORT_LABELS,
  type JobFilters,
} from '@/lib/job-filters';
import { formatMoney } from '@/components/ui/money-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * Quick trade chips plus the entry point to the full sheet.
 *
 * The active filters are also echoed back as removable chips: a provider who
 * filtered ten minutes ago should never have to open the sheet to work out why
 * the feed looks empty.
 */
export function JobFilterBar({
  filters,
  onChange,
  onOpenFilters,
}: {
  filters: JobFilters;
  onChange: (next: JobFilters) => void;
  onOpenFilters: () => void;
}) {
  const theme = useTheme();
  const active = countActiveFilters(filters);
  const chips = describeActive(filters);

  function toggleCategory(id: string) {
    onChange({
      ...filters,
      categories: filters.categories.includes(id)
        ? filters.categories.filter((c) => c !== id)
        : [...filters.categories, id],
    });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {/* Pinned so it stays reachable however far the trades scroll. */}
        <Pressable
          onPress={onOpenFilters}
          style={({ pressed }) => [
            styles.filterBtn,
            {
              backgroundColor: active ? theme.tint : theme.backgroundElement,
              borderColor: active ? theme.tint : theme.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <Icon
            name="options"
            size={16}
            color={active ? theme.tintText : theme.text}
          />
          <Text style={[Type.callout, { color: active ? theme.tintText : theme.text }]}>
            Filters
          </Text>
          {active ? (
            <View style={[styles.badge, { backgroundColor: theme.tintText }]}>
              <Text style={[Type.micro, { color: theme.tint }]}>{active}</Text>
            </View>
          ) : null}
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trades}>
          {Categories.map((c) => {
            const selected = filters.categories.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => toggleCategory(c.id)}
                style={({ pressed }) => [
                  styles.trade,
                  {
                    backgroundColor: selected ? theme.tint + '1F' : theme.backgroundElement,
                    borderColor: selected ? theme.tint : 'transparent',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <Icon
                  name={c.icon as IconName}
                  size={14}
                  color={selected ? theme.tint : theme.textSecondary}
                />
                <Text
                  style={[
                    Type.callout,
                    { color: selected ? theme.tint : theme.textSecondary },
                  ]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {chips.length ? (
        <Animated.View entering={FadeIn} layout={LinearTransition} style={styles.activeRow}>
          {chips.map((chip) => (
            <Pressable
              key={chip.key}
              onPress={() => onChange({ ...filters, ...chip.clear })}
              style={[styles.activeChip, { backgroundColor: theme.tint + '14' }]}>
              <Text style={[Type.caption, { color: theme.tint }]}>{chip.label}</Text>
              <Icon name="close" size={12} color={theme.tint} />
            </Pressable>
          ))}
          <Pressable onPress={() => onChange(emptyJobFilters)} style={styles.clearAll}>
            <Text style={[Type.caption, { color: theme.textSecondary }]}>Clear all</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

type ActiveChip = { key: string; label: string; clear: Partial<JobFilters> };

/** Human-readable summary of each active filter, plus how to switch it off. */
function describeActive(f: JobFilters): ActiveChip[] {
  const chips: ActiveChip[] = [];

  for (const id of f.categories) {
    chips.push({
      key: `cat-${id}`,
      label: categoryLabel(id),
      clear: { categories: f.categories.filter((c) => c !== id) },
    });
  }

  if (f.minBudget != null || f.maxBudget != null) {
    const min = f.minBudget != null ? formatMoney(f.minBudget, 'NGN', true) : null;
    const max = f.maxBudget != null ? formatMoney(f.maxBudget, 'NGN', true) : null;
    chips.push({
      key: 'budget',
      label: min && max ? `${min}–${max}` : min ? `${min}+` : `up to ${max}`,
      clear: { minBudget: null, maxBudget: null },
    });
  }

  if (f.location.trim()) {
    chips.push({ key: 'loc', label: f.location.trim(), clear: { location: '' } });
  }

  if (f.postedWithinDays != null) {
    const opt = POSTED_OPTIONS.find((o) => o.value === f.postedWithinDays);
    chips.push({
      key: 'posted',
      label: opt?.label ?? `${f.postedWithinDays}d`,
      clear: { postedWithinDays: null },
    });
  }

  if (f.budgetedOnly) {
    chips.push({ key: 'budgeted', label: 'Has budget', clear: { budgetedOnly: false } });
  }

  if (f.matchesMySkills) {
    chips.push({ key: 'skills', label: 'My trades', clear: { matchesMySkills: false } });
  }

  if (f.sort !== 'newest') {
    chips.push({ key: 'sort', label: SORT_LABELS[f.sort], clear: { sort: 'newest' } });
  }

  return chips;
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trades: { gap: Spacing.two, paddingRight: Spacing.four },
  trade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  activeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  clearAll: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.one },
});
