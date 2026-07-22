import { supabase } from '@/services/supabase';

/**
 * Open a dispute on a job: records it and flips the job to `disputed`.
 * The UI also emails the support team (mail composer) after this resolves.
 */
export async function createDispute(input: {
  jobId: string;
  openedBy: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.from('disputes').insert({
    job_id: input.jobId,
    opened_by: input.openedBy,
    reason: input.reason,
  });
  if (error) throw error;

  const { error: jobError } = await supabase
    .from('jobs')
    .update({ status: 'disputed' })
    .eq('id', input.jobId);
  if (jobError) throw jobError;
}
