import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { Page } from '@/services/pagination';

export type InfiniteListQuery<T> = UseInfiniteQueryResult<InfiniteData<Page<T>>, Error>;

/**
 * Adapts an infinite query to a FlatList.
 *
 * Flattens the loaded pages into one array, and returns an `onEndReached` that
 * ignores calls while a page is already in flight — FlatList fires it repeatedly
 * as you scroll, which would otherwise request the same page several times.
 */
export function useInfiniteList<T>(query: InfiniteListQuery<T>) {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { items, onEndReached, loadingMore: isFetchingNextPage };
}
