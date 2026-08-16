/**
 * Filter model for the provider's job feed. Kept out of the components so the
 * service layer, the query keys and the UI all agree on one shape — the usual way
 * filter bugs appear is three places each holding their own idea of "empty".
 */

export type JobSort = 'newest' | 'budget_high' | 'budget_low';

export type JobFilters = {
  categories: string[];
  minBudget: number | null;
  maxBudget: number | null;
  location: string;
  /** Only jobs posted within this many days. `null` = any time. */
  postedWithinDays: number | null;
  sort: JobSort;
  /** Hide jobs the client left open-ended. */
  budgetedOnly: boolean;
  /** Restrict to the categories on the provider's own profile. */
  matchesMySkills: boolean;
};

export const emptyJobFilters: JobFilters = {
  categories: [],
  minBudget: null,
  maxBudget: null,
  location: '',
  postedWithinDays: null,
  sort: 'newest',
  budgetedOnly: false,
  matchesMySkills: false,
};

export const SORT_LABELS: Record<JobSort, string> = {
  newest: 'Newest first',
  budget_high: 'Highest budget',
  budget_low: 'Lowest budget',
};

export const POSTED_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Any time', value: null },
  { label: '24 hours', value: 1 },
  { label: '3 days', value: 3 },
  { label: 'This week', value: 7 },
];

/**
 * How many filters are actually narrowing the results. Sort is excluded on
 * purpose — reordering is not filtering, and counting it would leave the badge
 * permanently showing "1".
 */
export function countActiveFilters(f: JobFilters): number {
  let n = 0;
  if (f.categories.length) n += 1;
  if (f.minBudget != null || f.maxBudget != null) n += 1;
  if (f.location.trim()) n += 1;
  if (f.postedWithinDays != null) n += 1;
  if (f.budgetedOnly) n += 1;
  if (f.matchesMySkills) n += 1;
  return n;
}

/** Stable cache key. Object identity changes on every render; this does not. */
export function serializeFilters(f: JobFilters): string {
  return [
    f.categories.slice().sort().join('|'),
    f.minBudget ?? '',
    f.maxBudget ?? '',
    f.location.trim().toLowerCase(),
    f.postedWithinDays ?? '',
    f.sort,
    f.budgetedOnly ? '1' : '',
    f.matchesMySkills ? '1' : '',
  ].join(':');
}

/** ISO cutoff for `postedWithinDays`, or null when unset. */
export function postedSince(days: number | null): string | null {
  if (days == null) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
