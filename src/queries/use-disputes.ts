import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/queries/keys';
import { getJobDispute, openDispute } from '@/services/disputes';

/** The latest dispute on a job — the open ticket, or the last resolved one. */
export function useJobDispute(jobId: string) {
  return useQuery({
    queryKey: queryKeys.dispute(jobId),
    queryFn: () => getJobDispute(jobId),
    enabled: !!jobId,
  });
}

export function useOpenDispute(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string; category?: string | null; desiredOutcome?: string | null }) =>
      openDispute({ jobId, ...input }),
    onSuccess: (dispute) => {
      // Seed rather than invalidate: the screen reads the reference straight
      // afterwards to build the support message, and a refetch would blank it.
      qc.setQueryData(queryKeys.dispute(jobId), dispute);
      qc.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      // The job has just moved into the `completed` segment on both sides.
      qc.invalidateQueries({ queryKey: queryKeys.jobs.mineAll() });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.hiredAll() });
    },
  });
}
