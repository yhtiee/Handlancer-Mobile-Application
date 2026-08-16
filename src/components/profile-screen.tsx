import { Link, Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Icon, type IconName, RatingStars, Screen } from '@/components/ui';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useUnreadCount } from '@/queries/use-notifications';
import { useAuth } from '@/providers/auth-provider';
import { useTabBarInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';

export function ProfileScreen({ shell }: { shell: 'user' | 'provider' }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarInset();
  const { profile, signOut } = useAuth();
  const unread = useUnreadCount();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Layout.headerTop, paddingBottom: bottomInset },
        ]}>
        <View style={styles.header}>
          <Avatar uri={profile?.avatar_url} name={profile?.name} size={88} />
          <Text selectable style={[styles.name, { color: theme.text }]}>
            {profile?.name ?? 'Your name'}
          </Text>
          <Text style={[styles.role, { color: theme.textSecondary }]}>
            {profile?.role === 'provider' ? 'Service Provider' : 'Customer'}
          </Text>
          {profile?.role === 'provider' ? (
            <RatingStars rating={profile?.rating ?? 0} size={16} />
          ) : null}
        </View>

        <Card padded={false} style={styles.menu}>
          <MenuRow
            href={routes.profileNotifications(shell)}
            icon="notifications"
            label="Notifications"
            badge={unread}
          />
          <Divider />
          <MenuRow href={routes.profileEdit(shell)} icon="pencil" label="Edit profile" />
          <Divider />
          {profile?.role === 'provider' ? (
            <>
              <MenuRow href={routes.profileReviews} icon="star" label="My reviews" />
              <Divider />
            </>
          ) : null}
          <MenuRow href={routes.profileSettings(shell)} icon="settings" label="Settings" />
          <Divider />
          <MenuRow href={routes.profileSupport(shell)} icon="help-circle" label="Support" />
        </Card>

        <Button title="Sign out" variant="ghost" onPress={signOut} />
      </Screen>
    </>
  );
}

function MenuRow({
  href,
  icon,
  label,
  badge,
}: {
  href: ReturnType<typeof routes.profileSettings>;
  icon: IconName;
  label: string;
  badge?: number;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <TouchableOpacity style={styles.row} onPress={() => router.push(href)}>
      <View style={[styles.rowIcon, { backgroundColor: theme.tint + '1F' }]}>
        <Icon name={icon} size={17} color={theme.tint} />
      </View>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: theme.danger }]}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      <Icon name="chevron-forward" size={16} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four, paddingTop: Spacing.three },
  header: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  name: { fontSize: 20, fontWeight: '700' },
  role: { fontSize: 15 },
  menu: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
});
