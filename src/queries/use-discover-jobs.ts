import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/keys';
import { listOpenJobs } from '@/services/jobs';

/**
 * Jobs a provider can apply to (public bids + direct invites), paginated and
 * filtered server-side. Pass an already-debounced search.
 */
export function useOpenJobs(search?: string) {
  const { session } = useAuth();
  const providerId = session?.user.id;
  return useInfiniteQuery({
    queryKey: queryKeys.jobs.discover(search),
    queryFn: ({ pageParam }) => listOpenJobs(providerId!, search, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!providerId,
  });
}
