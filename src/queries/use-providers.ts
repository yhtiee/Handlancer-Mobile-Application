import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  emptyProviderFilters,
  serializeProviderFilters,
  type ProviderFilters,
} from '@/lib/provider-filters';
import { queryKeys } from '@/queries/keys';
import { countProviders, getProvider, listProviders } from '@/services/profiles';

/** Paginated providers, filtered server-side. Pass an already-debounced search. */
export function useProviders(
  search?: string,
  filters: ProviderFilters = emptyProviderFilters,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.providers(search, serializeProviderFilters(filters)),
    queryFn: ({ pageParam }) => listProviders(search, pageParam, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}

/**
 * Count for the filter sheet's "Show N providers" button. Separate from the list
 * so the sheet can preview a filter set the grid has not switched to yet.
 */
export function useProvidersCount(search: string | undefined, filters: ProviderFilters) {
  return useQuery({
    queryKey: queryKeys.providersCount(search, serializeProviderFilters(filters)),
    queryFn: () => countProviders(search, filters),
    // Keeps the number on the button from flashing to a spinner on every tweak.
    placeholderData: (prev) => prev,
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: queryKeys.profile(id),
    queryFn: () => getProvider(id),
    enabled: !!id,
  });
}
