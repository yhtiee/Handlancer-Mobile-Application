import { Stack } from 'expo-router';
import { FlatList, Pressable, Text } from 'react-native';

import { NotificationRow } from '@/components/notifications/notification-row';
import { EmptyState, GlobalLoader, ListFooter, ScreenView } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/queries/use-notifications';
import { useContentInset } from '@/hooks/use-insets';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTheme } from '@/hooks/use-theme';

export function NotificationsScreen() {
  const theme = useTheme();
  const bottomInset = useContentInset();
  const query = useNotifications();
  const { items: notifications, onEndReached, loadingMore } = useInfiniteList(query);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <ScreenView>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerRight: hasUnread
            ? () => (
                <Pressable hitSlop={8} onPress={() => markAll.mutate()}>
                  <Text style={{ color: theme.tint, fontWeight: '600', fontSize: 15 }}>
                    Mark all read
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      {query.isLoading ? (
        <GlobalLoader backgroundColor="transparent" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          onRefresh={query.refetch}
          refreshing={query.isRefetching && !loadingMore}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={<ListFooter loading={loadingMore} />}
          contentContainerStyle={{
            paddingHorizontal: Layout.gutter,
            paddingTop: Layout.headerGap,
            paddingBottom: bottomInset,
            gap: Spacing.two,
          }}
          renderItem={({ item }) => (
            <Pressable onPress={() => !item.read && markRead.mutate(item.id)}>
              <NotificationRow notification={item} />
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="No notifications"
              description="Quotes, hires, messages and payments will show up here."
            />
          }
        />
      )}
    </ScreenView>
  );
}

