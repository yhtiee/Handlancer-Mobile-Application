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

/** Postgres unique-violation. Raised by `conversations_pair_uniq` (migration 0019). */
const UNIQUE_VIOLATION = '23505';

/** Existing thread between two people, whichever column each of them sits in. */
async function findConversation(
  userId: string,
  otherUserId: string,
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(
      `and(user_id.eq.${userId},provider_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},provider_id.eq.${userId})`,
    )
    // Oldest first: that row carries the history. 0019 leaves only one per pair,
    // but ordering keeps the choice deterministic on a database not yet migrated.
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

/**
 * Open the thread with someone, creating it only if there truly is none.
 *
 * There is exactly one thread per pair of people — see 0019, which enforces it
 * with a normalised unique index. `jobId` says what the thread is *about* right
 * now, not which thread to use: messaging the same provider about a second job
 * continues the existing conversation rather than starting a parallel one, and
 * the header follows to the new job.
 */
export async function getOrCreateConversation(
  userId: string,
  otherUserId: string,
  jobId: string | null,
): Promise<Conversation> {
  const existing = await findConversation(userId, otherUserId);
  if (existing) {
    if (!jobId || existing.job_id === jobId) return existing;
    // Point the thread at the job being discussed now. A failure here is not
    // worth blocking the chat over — the thread is still the right one.
    const { data } = await supabase
      .from('conversations')
      .update({ job_id: jobId })
      .eq('id', existing.id)
      .select('*')
      .maybeSingle();
    return data ?? existing;
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, provider_id: otherUserId, job_id: jobId })
    .select('*')
    .single();

  if (error) {
    // Someone else won the race between the lookup above and this insert; the
    // row they created is the one to use.
    if (error.code === UNIQUE_VIOLATION) {
      const raced = await findConversation(userId, otherUserId);
      if (raced) return raced;
    }
    throw error;
  }
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
