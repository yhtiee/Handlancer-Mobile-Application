import type { Notification } from '@/services/database.types';
import { pageRange, toPage, type Page } from '@/services/pagination';
import { supabase } from '@/services/supabase';

export async function listNotifications(userId: string, page: number): Promise<Page<Notification>> {
  const { from, to } = pageRange(page);
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    // Unique tiebreaker so rows can't shuffle between pages.
    .order('id', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return toPage(data, page);
}

/**
 * Unread count for the badge.
 *
 * This has to be its own query rather than a filter over the loaded list: the
 * list is paginated, so counting client-side would only ever count the pages
 * that happen to be in memory. `head: true` fetches the count without the rows.
 */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  if (error) throw error;
}

/** Subscribe to new notifications for a user. Returns an unsubscribe fn. */
export function subscribeToNotifications(
  userId: string,
  onInsert: (n: Notification) => void,
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onInsert(payload.new as Notification),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
