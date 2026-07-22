import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/queries/keys';
import { getProvider, listProviders } from '@/services/profiles';

/** Paginated providers, filtered server-side. Pass an already-debounced search. */
export function useProviders(search?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.providers(search),
    queryFn: ({ pageParam }) => listProviders(search, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: queryKeys.profile(id),
    queryFn: () => getProvider(id),
    enabled: !!id,
  });
}
