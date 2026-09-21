import type { Dispute } from '@/services/database.types';
import { supabase } from '@/services/supabase';

/**
 * Open a dispute on a job.
 *
 * One RPC rather than the insert-then-update this used to be: the dispute row,
 * the job's `disputed` status and the provider's notification all have to land
 * together or not at all. See migration 0020 — the notification in particular
 * cannot be written from here, since `notifications` has no insert policy for
 * `authenticated`.
 *
 * Idempotent server-side: calling it again on a job that already has a live
 * ticket returns that ticket instead of filing a second one.
 */
export async function openDispute(input: {
  jobId: string;
  reason: string;
  category?: string | null;
  desiredOutcome?: string | null;
}): Promise<Dispute> {
  const { data, error } = await supabase.rpc('open_dispute', {
    p_job_id: input.jobId,
    p_reason: input.reason,
    p_category: input.category ?? null,
    p_desired_outcome: input.desiredOutcome ?? null,
  });
  if (error) throw error;

  // The function returns a `disputes` row; PostgREST hands back the object for a
  // scalar composite return, but tolerate a single-element array defensively.
  const row = (Array.isArray(data) ? data[0] : data) as Dispute | null;
  if (!row) throw new Error('The dispute could not be opened. Please try again.');
  return row;
}

/**
 * The live ticket on a job, if there is one.
 *
 * Both parties can read it (RLS: "dispute party"), which is what lets the
 * provider's screen name the reference they should quote to support.
 */
export async function getJobDispute(jobId: string): Promise<Dispute | null> {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
