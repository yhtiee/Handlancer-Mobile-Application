/** Rows fetched per page by every paginated list. */
export const PAGE_SIZE = 20;

export type Page<T> = {
  items: T[];
  /** Index of the next page, or null once the last page has been served. */
  nextPage: number | null;
};

/** Supabase `.range()` bounds for a zero-based page index. */
export function pageRange(page: number): { from: number; to: number } {
  const from = page * PAGE_SIZE;
  return { from, to: from + PAGE_SIZE - 1 };
}

/**
 * Wrap a page of rows for an infinite query.
 *
 * A short page means the end. A full page means there may be more, so we offer
 * another — which costs one empty fetch when the total is an exact multiple of
 * PAGE_SIZE. That is cheaper than a `count` on every page.
 */
export function toPage<T>(rows: T[] | null, page: number): Page<T> {
  const items = rows ?? [];
  return { items, nextPage: items.length < PAGE_SIZE ? null : page + 1 };
}

/**
 * Make a user's search term safe to interpolate into a PostgREST `or()` filter.
 *
 * `or()` takes a comma-separated list of conditions wrapped in parens, so a term
 * containing `,` or `(` `)` would be parsed as filter syntax rather than as text
 * — breaking the query or silently changing what it matches.
 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()]/g, ' ').trim();
}
