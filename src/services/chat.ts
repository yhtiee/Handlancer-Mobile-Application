import type { Conversation, Message, Profile } from '@/services/database.types';
import { supabase } from '@/services/supabase';

export type ConversationSummary = Conversation & {
  other: Profile | null;
  jobTitle: string | null;
  lastMessage: Message | null;
};

export type ConversationDetail = Conversation & {
  other: Profile | null;
  jobTitle: string | null;
};

/** Open an existing conversation between two users if one exists, otherwise create a new one. */
export async function getOrCreateConversation(
  userId: string,
  otherUserId: string,
  jobId: string | null,
): Promise<Conversation> {
  // Query any existing conversations between these two users (either direction)
  const { data: existingList, error: listError } = await supabase
    .from('conversations')
    .select('*')
    .or(
      `and(user_id.eq.${userId},provider_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},provider_id.eq.${userId})`,
    )
    .order('created_at', { ascending: false });

  if (listError) throw listError;

  if (existingList && existingList.length > 0) {
    // If a specific jobId was requested, prioritize an existing thread for that job
    if (jobId) {
      const matchWithJob = existingList.find((c) => c.job_id === jobId);
      if (matchWithJob) return matchWithJob;
    }
    // Otherwise return the existing conversation thread between these two users
    return existingList[0];
  }

  // Create a new conversation row only if no existing conversation exists between the two users
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, provider_id: otherUserId, job_id: jobId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listConversations(myId: string): Promise<ConversationSummary[]> {
  const { data: convos, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user_id.eq.${myId},provider_id.eq.${myId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!convos?.length) return [];

  const otherIds = [...new Set(convos.map((c) => (c.user_id === myId ? c.provider_id : c.user_id)))];
  const jobIds = [...new Set(convos.map((c) => c.job_id).filter(Boolean) as string[])];
  const convoIds = convos.map((c) => c.id);

  const [{ data: profiles }, { data: jobs }, { data: messages }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', otherIds),
    jobIds.length
      ? supabase.from('jobs').select('id, title').in('id', jobIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: false }),
  ]);

  const lastByConvo = new Map<string, Message>();
  for (const m of messages ?? []) {
    if (!lastByConvo.has(m.conversation_id)) lastByConvo.set(m.conversation_id, m);
  }

  return convos
    .map((c) => {
      const otherId = c.user_id === myId ? c.provider_id : c.user_id;
      return {
        ...c,
        other: profiles?.find((p) => p.id === otherId) ?? null,
        jobTitle: jobs?.find((j) => j.id === c.job_id)?.title ?? null,
        lastMessage: lastByConvo.get(c.id) ?? null,
      };
    })
    .sort((a, b) => {
      const at = a.lastMessage?.created_at ?? a.created_at;
      const bt = b.lastMessage?.created_at ?? b.created_at;
      return bt.localeCompare(at);
    });
}

export async function getConversation(
  id: string,
  myId: string,
): Promise<ConversationDetail | null> {
  const { data: convo, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!convo) return null;

  const otherId = convo.user_id === myId ? convo.provider_id : convo.user_id;
  const [{ data: other }, { data: job }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', otherId).maybeSingle(),
    convo.job_id
      ? supabase.from('jobs').select('id, title').eq('id', convo.job_id).maybeSingle()
      : Promise.resolve({ data: null as { id: string; title: string } | null }),
  ]);

  return { ...convo, other: other ?? null, jobTitle: job?.title ?? null };
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: body.trim() })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Subscribe to new messages in a conversation. Returns an unsubscribe fn. */
export function subscribeToMessages(
  conversationId: string,
  onInsert: (message: Message) => void,
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
