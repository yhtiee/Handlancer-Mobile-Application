import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/keys';
import type { Notification } from '@/services/database.types';
import {
  countUnreadNotifications,
  listNotifications,
  markAllRead,
  markRead,
  subscribeToNotifications,
} from '@/services/notifications';
import type { Page } from '@/services/pagination';

/** The notification feed, paginated. */
export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useInfiniteQuery({
    queryKey: queryKeys.notifications(),
    queryFn: ({ pageParam }) => listNotifications(userId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!userId,
  });
}

/**
 * Opens the single realtime subscription that keeps the notifications cache
 * fresh. Mount this exactly once (in PushRegistrar) — multiple subscribers to
 * the same Supabase channel throw "cannot add postgres_changes after subscribe".
 *
 * `onArrive` runs for each new row. PushRegistrar uses it to raise a local
 * notification on runtimes with no remote push, so the phone still buzzes.
 */
export function useNotificationsRealtime(onArrive?: (n: Notification) => void) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();

  // Kept in a ref so a caller passing an inline closure cannot tear the channel
  // down and rebuild it on every render. `useRef` seeds it with the value from
  // the first render, so the subscribe effect below always sees a current one.
  const arriveRef = useRef(onArrive);
  useEffect(() => {
    arriveRef.current = onArrive;
  }, [onArrive]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToNotifications(userId, (n) => {
      arriveRef.current?.(n);
      // Newest first, so an arrival belongs at the head of the first page.
      qc.setQueryData<InfiniteData<Page<Notification>>>(queryKeys.notifications(), (prev) => {
        if (!prev?.pages.length) return prev;
        const alreadyHave = prev.pages.some((page) => page.items.some((x) => x.id === n.id));
        if (alreadyHave) return prev;
        const [first, ...rest] = prev.pages;
        return { ...prev, pages: [{ ...first, items: [n, ...first.items] }, ...rest] };
      });
      // The badge is counted in Postgres, so it needs a refetch rather than a
      // cache patch.
      qc.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    });
    return unsubscribe;
  }, [userId, qc]);
}

/** Unread badge count, counted server-side (the list is paginated). */
export function useUnreadCount(): number {
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data } = useQuery({
    queryKey: queryKeys.unreadCount(),
    queryFn: () => countUnreadNotifications(userId!),
    enabled: !!userId,
  });
  return data ?? 0;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications() });
      qc.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    },
  });
}

export function useMarkAllRead() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllRead(session!.user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications() });
      qc.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    },
  });
}
