import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, type IconName } from '@/components/ui';
import { Categories } from '@/constants/categories';
import { Elevation, Radius, Spacing, Type } from '@/constants/theme';
import {
  countActiveFilters,
  emptyJobFilters,
  POSTED_OPTIONS,
  SORT_LABELS,
  type JobFilters,
  type JobSort,
} from '@/lib/job-filters';
import { useAuth } from '@/providers/auth-provider';
import { useOpenJobsCount } from '@/queries/use-discover-jobs';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';

/**
 * Advanced filters for the provider job feed.
 *
 * Edits are held in local draft state and only applied on "Show N jobs", so the
 * feed underneath does not thrash on every tap. The count, however, previews the
 * draft live — the whole point is knowing whether a filter leaves you anything.
 */
type SheetProps = {
  visible: boolean;
  onClose: () => void;
  value: JobFilters;
  onApply: (next: JobFilters) => void;
  search?: string;
};

/**
 * Unmounts entirely while closed. That is what lets the body seed its draft from
 * `value` with a plain useState initialiser — syncing it from an effect instead
 * would re-render on every open and trips the cascading-render lint rule.
 */
export function JobFilterSheet(props: SheetProps) {
  if (!props.visible) return null;
  return <FilterSheetBody {...props} />;
}

function FilterSheetBody({ onClose, value, onApply, search }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [draft, setDraft] = useState<JobFilters>(value);

  // Debounced so typing a budget doesn't fire a count per keystroke.
  const debouncedDraft = useDebouncedValue(draft);
  const { data: count, isFetching } = useOpenJobsCount(search, debouncedDraft);

  const active = countActiveFilters(draft);
  const set = <K extends keyof JobFilters>(key: K, val: JobFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: val }));

  function toggleCategory(id: string) {
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(id)
        ? d.categories.filter((c) => c !== id)
        : [...d.categories, id],
    }));
  }

  const hasSkills = (profile?.services?.length ?? 0) > 0;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          entering={FadeInDown.springify().damping(18).mass(0.7)}
          style={[
            styles.sheet,
            { backgroundColor: theme.background, boxShadow: Elevation.lg },
          ]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />

          <View style={styles.headerRow}>
            <Text style={[Type.h2, { color: theme.text }]}>Filters</Text>
            {active > 0 ? (
              <Pressable onPress={() => setDraft(emptyJobFilters)} hitSlop={8}>
                <Text style={[Type.bodyMedium, { color: theme.tint }]}>Reset all</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* ── Category ─────────────────────────────────────── */}
            <Section title="Trade" hint={draft.categories.length ? `${draft.categories.length} selected` : undefined}>
              <View style={styles.chipWrap}>
                {Categories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.label}
                    icon={c.icon}
                    selected={draft.categories.includes(c.id)}
                    onPress={() => toggleCategory(c.id)}
                  />
                ))}
              </View>
              {hasSkills ? (
                <Toggle
                  label="Only my trades"
                  hint="Match the services on your profile"
                  icon="ribbon"
                  value={draft.matchesMySkills}
                  onChange={(v) => set('matchesMySkills', v)}
                />
              ) : null}
            </Section>

            {/* ── Budget ───────────────────────────────────────── */}
            <Section title="Budget">
              <View style={styles.budgetRow}>
                <BudgetField
                  label="Min"
                  value={draft.minBudget}
                  onChange={(v) => set('minBudget', v)}
                />
                <Text style={[Type.body, { color: theme.textSecondary }]}>—</Text>
                <BudgetField
                  label="Max"
                  value={draft.maxBudget}
                  onChange={(v) => set('maxBudget', v)}
                />
              </View>
              <View style={styles.chipWrap}>
                {[10_000, 50_000, 100_000].map((v) => (
                  <Chip
                    key={v}
                    label={`₦${v.toLocaleString()}+`}
                    selected={draft.minBudget === v}
                    onPress={() => set('minBudget', draft.minBudget === v ? null : v)}
                  />
                ))}
              </View>
              <Toggle
                label="Hide open budgets"
                hint="Only jobs with a stated budget"
                icon="pricetag"
                value={draft.budgetedOnly}
                onChange={(v) => set('budgetedOnly', v)}
              />
            </Section>

            {/* ── Location ─────────────────────────────────────── */}
            <Section title="Location">
              <TextInput
                value={draft.location}
                onChangeText={(v) => set('location', v)}
                placeholder="e.g. Lekki, Lagos"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundElement },
                ]}
              />
            </Section>

            {/* ── Posted ───────────────────────────────────────── */}
            <Section title="Posted">
              <View style={styles.chipWrap}>
                {POSTED_OPTIONS.map((o) => (
                  <Chip
                    key={o.label}
                    label={o.label}
                    selected={draft.postedWithinDays === o.value}
                    onPress={() => set('postedWithinDays', o.value)}
                  />
                ))}
              </View>
            </Section>

            {/* ── Sort ─────────────────────────────────────────── */}
            <Section title="Sort by">
              <View style={styles.chipWrap}>
                {(Object.keys(SORT_LABELS) as JobSort[]).map((s) => (
                  <Chip
                    key={s}
                    label={SORT_LABELS[s]}
                    selected={draft.sort === s}
                    onPress={() => set('sort', s)}
                  />
                ))}
              </View>
            </Section>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.two }]}>
            <Button
              title={
                isFetching && count == null
                  ? 'Counting…'
                  : count === 0
                    ? 'No jobs match'
                    : `Show ${count ?? 0} job${count === 1 ? '' : 's'}`
              }
              size="lg"
              disabled={count === 0}
              onPress={() => {
                onApply(draft);
                onClose();
              }}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[Type.h3, { color: theme.text }]}>{title}</Text>
        {hint ? <Text style={[Type.caption, { color: theme.tint }]}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.tint : theme.backgroundElement,
          borderColor: selected ? theme.tint : theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      {icon ? (
        <Icon name={icon} size={14} color={selected ? theme.tintText : theme.textSecondary} />
      ) : null}
      <Text
        style={[Type.callout, { color: selected ? theme.tintText : theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Toggle({
  label,
  hint,
  icon,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  icon: IconName;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[
        styles.toggle,
        {
          backgroundColor: value ? theme.tint + '14' : theme.backgroundElement,
          borderColor: value ? theme.tint + '44' : 'transparent',
        },
      ]}>
      <Icon name={icon} size={18} color={value ? theme.tint : theme.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={[Type.bodyMedium, { color: theme.text }]}>{label}</Text>
        <Text style={[Type.caption, { color: theme.textSecondary }]}>{hint}</Text>
      </View>
      <View
        style={[
          styles.check,
          {
            backgroundColor: value ? theme.tint : 'transparent',
            borderColor: value ? theme.tint : theme.border,
          },
        ]}>
        {value ? <Icon name="checkmark" size={13} color={theme.tintText} /> : null}
      </View>
    </Pressable>
  );
}

function BudgetField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.budgetField, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[Type.micro, { color: theme.textSecondary }]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value == null ? '' : String(value)}
        onChangeText={(t) => {
          const digits = t.replace(/[^0-9]/g, '');
          onChange(digits ? Number(digits) : null);
        }}
        keyboardType="number-pad"
        placeholder="₦ any"
        placeholderTextColor={theme.textSecondary}
        style={[Type.bodyMedium, { color: theme.text, padding: 0 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 11, 15, 0.55)' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderCurve: 'continuous',
    paddingTop: Spacing.two,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: Radius.pill,
    alignSelf: 'center',
    marginBottom: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.five },
  section: { gap: Spacing.twoHalf },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  budgetField: {
    flex: 1,
    gap: 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  input: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    fontSize: 16,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
});
