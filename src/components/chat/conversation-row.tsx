import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import type { ConversationSummary } from '@/services/chat';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

export function ConversationRow({
  conversation,
  shell,
}: {
  conversation: ConversationSummary;
  shell: 'user' | 'provider';
}) {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { other, lastMessage, jobTitle } = conversation;
  
  // Determine if message is unread (last message from the other person)
  const isUnread = lastMessage && lastMessage.sender_id !== session?.user.id;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.backgroundElement}]}
      onPress={() => router.push(routes.chatThread(shell, conversation.id))}
      >
      <View style={styles.avatarContainer}>
        <Avatar uri={other?.avatar_url} name={other?.name} size={48} />
        {isUnread && <View style={[styles.unreadDot, { backgroundColor: '#3B82F6' }]} />}
      </View>
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.text, fontWeight: isUnread ? '700' : '600' }]}>
            {other?.name ?? 'Conversation'}
          </Text>
          {lastMessage ? (
            <Text style={[styles.time, { color: theme.textSecondary, fontWeight: isUnread ? '600' : '400' }]}>
              {timeAgo(lastMessage.created_at)}
            </Text>
          ) : null}
        </View>
        <Text numberOfLines={1} style={[styles.preview, { color: isUnread ? theme.text : theme.textSecondary, fontWeight: isUnread ? '500' : '400' }]}>
          {lastMessage?.body ?? (jobTitle ? `Re: ${jobTitle}` : 'Start the conversation')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  avatarContainer: {
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    bottom: -2,
    right: -2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  body: { flex: 1, gap: 2 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  name: { fontSize: 16, flex: 1 },
  time: { fontSize: 12 },
  preview: { fontSize: 14 },
});
