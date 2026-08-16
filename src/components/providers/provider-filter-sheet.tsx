import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, type IconName } from '@/components/ui';
import { Categories } from '@/constants/categories';
import { Elevation, Radius, Spacing, Type } from '@/constants/theme';
import {
  countActiveProviderFilters,
  emptyProviderFilters,
  EXPERIENCE_OPTIONS,
  PROVIDER_SORT_LABELS,
  RATING_OPTIONS,
  type ProviderFilters,
  type ProviderSort,
} from '@/lib/provider-filters';
import { useProvidersCount } from '@/queries/use-providers';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  value: ProviderFilters;
  onApply: (next: ProviderFilters) => void;
  search?: string;
};

/**
 * Unmounts while closed so the body can seed its draft with a plain useState
 * initialiser — syncing from an effect re-renders on every open and trips the
 * cascading-render rule.
 */
export function ProviderFilterSheet(props: SheetProps) {
  if (!props.visible) return null;
  return <ProviderFilterBody {...props} />;
}

function ProviderFilterBody({ onClose, value, onApply, search }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ProviderFilters>(value);

  // Debounced so typing a rate doesn't fire a count per keystroke.
  const debouncedDraft = useDebouncedValue(draft);
  const { data: count, isFetching } = useProvidersCount(search, debouncedDraft);

  const active = countActiveProviderFilters(draft);
  const set = <K extends keyof ProviderFilters>(key: K, val: ProviderFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: val }));

  function toggleService(id: string) {
    setDraft((d) => ({
      ...d,
      services: d.services.includes(id)
        ? d.services.filter((s) => s !== id)
        : [...d.services, id],
    }));
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          entering={FadeInDown.springify().damping(18).mass(0.7)}
          style={[styles.sheet, { backgroundColor: theme.background, boxShadow: Elevation.lg }]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />

          <View style={styles.headerRow}>
            <Text style={[Type.h2, { color: theme.text }]}>Filters</Text>
            {active > 0 ? (
              <Pressable onPress={() => setDraft(emptyProviderFilters)} hitSlop={8}>
                <Text style={[Type.bodyMedium, { color: theme.tint }]}>Reset all</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <Section
              title="Trade"
              hint={draft.services.length ? `${draft.services.length} selected` : undefined}>
              <View style={styles.chipWrap}>
                {Categories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.label}
                    icon={c.icon}
                    selected={draft.services.includes(c.id)}
                    onPress={() => toggleService(c.id)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Rating">
              <View style={styles.chipWrap}>
                {RATING_OPTIONS.map((r) => (
                  <Chip
                    key={r}
                    label={`${r}★ & up`}
                    selected={draft.minRating === r}
                    onPress={() => set('minRating', draft.minRating === r ? null : r)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Experience">
              <View style={styles.chipWrap}>
                {EXPERIENCE_OPTIONS.map((y) => (
                  <Chip
                    key={y}
                    label={`${y}+ yr${y === 1 ? '' : 's'}`}
                    selected={draft.minExperience === y}
                    onPress={() => set('minExperience', draft.minExperience === y ? null : y)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Max hourly rate">
              <View style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[Type.micro, { color: theme.textSecondary }]}>UP TO</Text>
                <TextInput
                  value={draft.maxRate == null ? '' : String(draft.maxRate)}
                  onChangeText={(t) => {
                    const digits = t.replace(/[^0-9]/g, '');
                    set('maxRate', digits ? Number(digits) : null);
                  }}
                  keyboardType="number-pad"
                  placeholder="₦ any"
                  placeholderTextColor={theme.textSecondary}
                  style={[Type.bodyMedium, { color: theme.text, padding: 0 }]}
                />
              </View>
            </Section>

            <Section title="Area">
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

            <Section title="Trust & availability">
              <Toggle
                label="Verified only"
                hint="ID-checked providers"
                icon="shield-checkmark"
                value={draft.verifiedOnly}
                onChange={(v) => set('verifiedOnly', v)}
              />
              <Toggle
                label="Available now"
                hint="Currently taking new jobs"
                icon="flash"
                value={draft.availableOnly}
                onChange={(v) => set('availableOnly', v)}
              />
            </Section>

            <Section title="Sort by">
              <View style={styles.chipWrap}>
                {(Object.keys(PROVIDER_SORT_LABELS) as ProviderSort[]).map((s) => (
                  <Chip
                    key={s}
                    label={PROVIDER_SORT_LABELS[s]}
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
                    ? 'No providers match'
                    : `Show ${count ?? 0} provider${count === 1 ? '' : 's'}`
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
      <Text style={[Type.callout, { color: selected ? theme.tintText : theme.text }]}>
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
  field: {
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
  footer: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
});
