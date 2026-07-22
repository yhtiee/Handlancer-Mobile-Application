import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Layout, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Primary (tab-root) in-screen header — used on screens with `headerShown:false`.
 * Safe-area aware (no native nav bar), with an optional eyebrow/leading row and
 * trailing actions, then a large title. Cross-platform.
 */
export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  leading,
}: {
  title: string;
  subtitle?: string;
  /** Small muted line above the title (e.g. a location). */
  eyebrow?: ReactNode;
  /** Right-aligned action buttons. */
  actions?: ReactNode;
  /** Optional element shown left of the eyebrow/title (e.g. an avatar). */
  leading?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Layout.headerTop }]}>
      <View style={styles.topRow}>
        {leading}
        <View style={styles.titleCol}>
          {eyebrow ? <View style={styles.eyebrow}>{eyebrow}</View> : null}
          <Text style={[Type.h1, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[Type.callout, { color: theme.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Layout.gutter, paddingBottom: Spacing.two, gap: Spacing.two },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  titleCol: { flex: 1, gap: 2 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
