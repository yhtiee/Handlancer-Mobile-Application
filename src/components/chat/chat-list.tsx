import { Stack } from 'expo-router';
import { FlatList, View } from 'react-native';

import { ConversationRow } from '@/components/chat/conversation-row';
import { EmptyState, ListSkeleton, ScreenHeader, ScreenView } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { useConversations } from '@/queries/use-chat';
import { useTabBarInset } from '@/hooks/use-insets';

export function ChatList({ shell }: { shell: 'user' | 'provider' }) {
  const bottomInset = useTabBarInset();
  const { data: conversations, isLoading, refetch, isRefetching } = useConversations();

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Messages" />
      {isLoading ? (
        <View style={{ paddingHorizontal: Layout.gutter, paddingTop: Layout.headerGap }}>
          <ListSkeleton />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Layout.gutter,
            paddingTop: Layout.headerGap,
            paddingBottom: bottomInset,
            gap: Spacing.two,
          }}
          renderItem={({ item }) => <ConversationRow conversation={item} shell={shell} />}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations"
              description={
                shell === 'user'
                  ? 'Message a provider from a job’s quotes to start chatting.'
                  : 'When a customer connects with you on a job, chats appear here.'
              }
            />
          }
        />
      )}
    </ScreenView>
  );
}
