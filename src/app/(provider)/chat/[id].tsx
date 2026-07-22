import { useLocalSearchParams } from 'expo-router';

import { ChatThread } from '@/components/chat/chat-thread';

export default function ProviderChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChatThread conversationId={id} />;
}
