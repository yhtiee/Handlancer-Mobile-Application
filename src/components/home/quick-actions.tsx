import { type Href, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type QuickAction = {
  icon: IconName;
  label: string;
  /** One-line hint under the label. Say what the action does, not what it is. */
  hint: string;
  href: Href;
};

/**
 * The row of shortcuts under the search field on a home screen.
 *
 * Takes exactly two actions: the first is the role's primary action and gets
 * the tinted treatment, the second is secondary and gets the outlined one. Both
 * shells render this so Home and Find Work stay symmetrical.
 */
export function QuickActions({ primary, secondary }: { primary: QuickAction; secondary: QuickAction }) {
  return (
    <View style={styles.row}>
      <ActionCard action={primary} variant="primary" />
      <ActionCard action={secondary} variant="secondary" />
    </View>
  );
}

function ActionCard({ action, variant }: { action: QuickAction; variant: 'primary' | 'secondary' }) {
  const theme = useTheme();
  const router = useRouter();
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${action.label}. ${action.hint}`}
      activeOpacity={0.7}
      onPress={() => router.push(action.href)}
      style={[
        styles.card,
        isPrimary
          ? { backgroundColor: theme.tint }
          : { backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border },
      ]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: isPrimary ? 'rgba(255,255,255,0.22)' : theme.tint + '1A' },
        ]}>
        <Icon name={action.icon} size={18} color={isPrimary ? '#ffffff' : theme.tint} />
      </View>
      <View style={styles.textCol}>
        <Text numberOfLines={1} style={[Type.bodyMedium, { color: isPrimary ? '#ffffff' : theme.text }]}>
          {action.label}
        </Text>
        <Text
          numberOfLines={1}
          style={[Type.caption, { color: isPrimary ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>
          {action.hint}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.twoHalf },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.twoHalf,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 1 },
});
