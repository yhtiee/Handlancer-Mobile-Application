import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/keys';
import type { Message } from '@/services/database.types';
import {
  getConversation,
  getOrCreateConversation,
  listConversations,
  listMessages,
  sendMessage,
  subscribeToMessages,
} from '@/services/chat';

export function useConversations() {
  const { session } = useAuth();
  const myId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.conversations(),
    queryFn: () => listConversations(myId!),
    enabled: !!myId,
  });
}

export function useConversation(id: string) {
  const { session } = useAuth();
  const myId = session?.user.id;
  return useQuery({
    queryKey: ['conversation', id] as const,
    queryFn: () => getConversation(id, myId!),
    enabled: !!myId && !!id,
  });
}

/** Messages for a conversation, kept live via a realtime subscription. */
export function useMessages(conversationId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: () => listMessages(conversationId),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = subscribeToMessages(conversationId, (message) => {
      qc.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) => {
        if (!prev) return [message];
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      qc.invalidateQueries({ queryKey: queryKeys.conversations() });
    });
    return unsubscribe;
  }, [conversationId, qc]);

  return query;
}

export function useSendMessage(conversationId: string) {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendMessage(conversationId, session!.user.id, body),
    onSuccess: (message) => {
      qc.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) => {
        if (!prev) return [message];
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      qc.invalidateQueries({ queryKey: queryKeys.conversations() });
    },
  });
}

export function useStartConversation() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, jobId }: { providerId: string; jobId: string | null }) =>
      getOrCreateConversation(session!.user.id, providerId, jobId),
    onSuccess: (conversation) => {
      qc.invalidateQueries({ queryKey: queryKeys.conversations() });
      // Reusing a thread can repoint it at the job now being discussed, so the
      // cached header for that thread is stale.
      qc.invalidateQueries({ queryKey: ['conversation', conversation.id] });
    },
  });
}
