import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/keys';
import type { JobStatus } from '@/services/database.types';
import {
  createJob,
  getJob,
  listMyJobs,
  listProviderJobs,
  updateJobStatus,
  type CreateJobInput,
  type ProviderJobSegment,
  type UserJobSegment,
} from '@/services/jobs';

/** The customer's jobs for one segment, paginated. */
export function useMyJobs(segment: UserJobSegment) {
  const { session } = useAuth();
  const ownerId = session?.user.id;
  return useInfiniteQuery({
    queryKey: queryKeys.jobs.mine(segment),
    queryFn: ({ pageParam }) => listMyJobs(ownerId!, segment, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!ownerId,
  });
}

/** The provider's hired work for one segment, paginated. */
export function useProviderJobs(segment: ProviderJobSegment) {
  const { session } = useAuth();
  const providerId = session?.user.id;
  return useInfiniteQuery({
    queryKey: queryKeys.jobs.hired(segment),
    queryFn: ({ pageParam }) => listProviderJobs(providerId!, segment, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!providerId,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => getJob(id),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJobInput) => createJob(session!.user.id, input),
    // A new job lands in whichever segment its status maps to, so refresh them all.
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.jobs.mineAll() }),
  });
}

export function useUpdateJobStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: JobStatus) => updateJobStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.jobs.detail(id) });
      // A status change moves the job between segments — refresh every one, on
      // both sides, since the job may be visible to its owner and its provider.
      qc.invalidateQueries({ queryKey: queryKeys.jobs.mineAll() });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.hiredAll() });
    },
  });
}
