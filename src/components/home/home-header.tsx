import { Link } from 'expo-router';
import { Appearance, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { Layout, Spacing, Type } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useUnreadCount } from '@/queries/use-notifications';
import { useTheme } from '@/hooks/use-theme';

/** Fixed top header for the Home / Find Work screens. */
export function HomeHeader({
  shell,
  name,
  location,
}: {
  shell: 'user' | 'provider';
  name?: string | null;
  location?: string | null;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const unread = useUnreadCount();
  const first = name?.trim().split(' ')[0];

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Layout.headerTop }]}>
      <View style={styles.left}>
        <View style={styles.eyebrow}>
          <Icon name="location" size={13} color={theme.tint} />
          <Text numberOfLines={1} style={[Type.caption, { color: theme.textSecondary }]}>
            {location?.trim() || 'Set your location'}
          </Text>
        </View>
        <Text numberOfLines={1} style={[Type.h2, { color: theme.text }]}>
          {first ? `Hi, ${first}` : 'Welcome'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          hitSlop={8}
          onPress={() => Appearance.setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
          style={StyleSheet.flatten([styles.bell, { backgroundColor: theme.backgroundElement }])}>
          <Icon name={colorScheme === 'dark' ? 'moon' : 'sunny'} size={20} color={theme.text} />
        </TouchableOpacity>
        <Link href={routes.profileNotifications(shell)} asChild>
          <TouchableOpacity
            hitSlop={8}
            style={StyleSheet.flatten([styles.bell, { backgroundColor: theme.backgroundElement }])}>
            <Icon name="notifications-outline" size={20} color={theme.text} />
            {unread > 0 ? (
              <View
                style={[styles.badge, { backgroundColor: theme.danger, borderColor: theme.background }]}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Layout.gutter,
    paddingBottom: Spacing.two,
  },
  left: { flex: 1, gap: 2 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
