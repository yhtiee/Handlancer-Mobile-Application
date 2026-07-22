import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/chat/message-bubble';
import { EmptyState, GlobalLoader, Icon, ScreenView } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useConversation, useMessages, useSendMessage } from '@/queries/use-chat';
import { useTheme } from '@/hooks/use-theme';

export function ChatThread({ conversationId }: { conversationId: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Default native stack header height (44 iOS / 56 Android) + safe-area top.
  // Used as the keyboard-avoiding offset; expo-router (SDK 56) no longer ships a
  // react-navigation `useHeaderHeight` we can import.
  const headerHeight = insets.top + (Platform.OS === 'ios' ? 44 : 56);
  const { session } = useAuth();
  const myId = session?.user.id;

  const { data: conversation } = useConversation(conversationId);
  const { data: messages, isLoading } = useMessages(conversationId);
  const send = useSendMessage(conversationId);

  const [text, setText] = useState('');
  // Newest first for the inverted list.
  const inverted = useMemo(() => (messages ? [...messages].reverse() : []), [messages]);

  function handleSend() {
    const body = text.trim();
    if (!body) return;
    setText('');
    send.mutate(body);
  }

  return (
    <ScreenView>
      <Stack.Screen
        options={{ title: conversation?.other?.name ?? 'Chat' }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
        style={{ flex: 1 }}
      >
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <FlatList
            data={inverted}
            keyExtractor={(item) => item.id}
            inverted
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <MessageBubble message={item} mine={item.sender_id === myId} />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="chatbubbles-outline"
                  title="Say hello"
                  description={
                    conversation?.jobTitle
                      ? `Discuss "${conversation.jobTitle}" with ${conversation.other?.name ?? 'them'}.`
                      : 'Send the first message to start the conversation.'
                  }
                />
              </View>
            }
          />
        )}

        <View
          style={[
            styles.inputBar,
            { paddingBottom: insets.bottom + Spacing.two, borderTopColor: theme.border },
          ]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim()}
            style={[styles.sendBtn, { backgroundColor: theme.tint, opacity: text.trim() ? 1 : 0.4 }]}>
            <Icon name="arrow-up" size={18} color={theme.tintText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.four, gap: Spacing.one, flexGrow: 1 },
  emptyWrap: { flex: 1, transform: [{ scaleY: -1 }] },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
