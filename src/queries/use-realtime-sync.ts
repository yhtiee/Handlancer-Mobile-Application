import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/keys';
import { supabase } from '@/services/supabase';

/**
 * One app-wide channel that invalidates the right caches when the database
 * changes, so users stop having to reload to see new state.
 *
 * Mount exactly once (PushRegistrar). Supabase rejects adding postgres_changes
 * bindings after `subscribe()`, so every table this app watches has to be
 * declared on the same channel here rather than sprinkled across screens.
 *
 * Realtime honours RLS: a subscriber only receives rows they could select
 * anyway, so this cannot leak another user's jobs or messages. What it can do is
 * invalidate a little more than strictly necessary — cheap, and far better than
 * missing an update.
 */
export function useRealtimeSync() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`app-sync:${userId}`)
      // Job status drives almost every screen: lists, detail, escrow, timeline.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
        const row = (payload.new ?? payload.old) as { id?: string } | null;
        if (row?.id) qc.invalidateQueries({ queryKey: queryKeys.jobs.detail(row.id) });
        qc.invalidateQueries({ queryKey: queryKeys.jobs.mineAll() });
        qc.invalidateQueries({ queryKey: queryKeys.jobs.hiredAll() });
        qc.invalidateQueries({ queryKey: ['jobs', 'discover'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, (payload) => {
        const row = (payload.new ?? payload.old) as { job_id?: string } | null;
        if (row?.job_id) {
          qc.invalidateQueries({ queryKey: queryKeys.quotes.forJob(row.job_id) });
          qc.invalidateQueries({ queryKey: queryKeys.jobs.detail(row.job_id) });
        }
        qc.invalidateQueries({ queryKey: queryKeys.quotes.mine() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrows' }, (payload) => {
        const row = (payload.new ?? payload.old) as { job_id?: string } | null;
        if (row?.job_id) {
          qc.invalidateQueries({ queryKey: ['escrow', row.job_id] });
          qc.invalidateQueries({ queryKey: queryKeys.jobs.detail(row.job_id) });
        }
      })
      // Disputes drive both sides of the sad path: the client's "Report a
      // problem" becomes the open ticket, and the provider's job screen grows
      // the disputed banner. Resolution flips the same row, so watch updates too.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, (payload) => {
        const row = (payload.new ?? payload.old) as { job_id?: string } | null;
        if (row?.job_id) {
          qc.invalidateQueries({ queryKey: queryKeys.dispute(row.job_id) });
          qc.invalidateQueries({ queryKey: queryKeys.jobs.detail(row.job_id) });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const row = (payload.new ?? payload.old) as { conversation_id?: string } | null;
        if (row?.conversation_id) {
          qc.invalidateQueries({ queryKey: queryKeys.messages(row.conversation_id) });
        }
        qc.invalidateQueries({ queryKey: queryKeys.conversations() });
      })
      // Wallet and ledger: top-ups land via the Flutterwave webhook, so the
      // client has no other way to learn the balance changed.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.wallet() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.transactions() });
        qc.invalidateQueries({ queryKey: queryKeys.wallet() });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
