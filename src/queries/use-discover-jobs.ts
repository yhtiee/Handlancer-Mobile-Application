import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { emptyJobFilters, serializeFilters, type JobFilters } from '@/lib/job-filters';
import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/keys';
import { countOpenJobs, listOpenJobs } from '@/services/jobs';

/**
 * Jobs a provider can apply to (public bids + direct invites), paginated and
 * filtered server-side. Pass an already-debounced search.
 */
export function useOpenJobs(search?: string, filters: JobFilters = emptyJobFilters) {
  const { session, profile } = useAuth();
  const providerId = session?.user.id;
  const mySkills = profile?.services ?? [];

  return useInfiniteQuery({
    queryKey: queryKeys.jobs.discover(search, serializeFilters(filters)),
    queryFn: ({ pageParam }) =>
      listOpenJobs(providerId!, search, pageParam, filters, mySkills),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!providerId,
  });
}

/**
 * Count for the filter sheet's "Show N jobs" button. Separate from the feed so
 * the sheet can preview a filter set the list has not been switched to yet.
 */
export function useOpenJobsCount(search: string | undefined, filters: JobFilters) {
  const { session, profile } = useAuth();
  const providerId = session?.user.id;
  const mySkills = profile?.services ?? [];

  return useQuery({
    queryKey: queryKeys.jobs.discoverCount(search, serializeFilters(filters)),
    queryFn: () => countOpenJobs(providerId!, search, filters, mySkills),
    enabled: !!providerId,
    // Keeps the number on the button from flashing to a spinner on every tweak.
    placeholderData: (prev) => prev,
  });
}
