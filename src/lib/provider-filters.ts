/**
 * Filter model for browsing service providers. Mirrors the job-feed model so the
 * two discovery surfaces behave the same way — see `job-filters.ts`.
 */

export type ProviderSort = 'rating' | 'experience' | 'rate_low' | 'newest';

export type ProviderFilters = {
  /** Category ids from `Categories`, matched against `profiles.services`. */
  services: string[];
  minRating: number | null;
  maxRate: number | null;
  minExperience: number | null;
  location: string;
  verifiedOnly: boolean;
  availableOnly: boolean;
  sort: ProviderSort;
};

export const emptyProviderFilters: ProviderFilters = {
  services: [],
  minRating: null,
  maxRate: null,
  minExperience: null,
  location: '',
  verifiedOnly: false,
  availableOnly: false,
  sort: 'rating',
};

export const PROVIDER_SORT_LABELS: Record<ProviderSort, string> = {
  rating: 'Top rated',
  experience: 'Most experienced',
  rate_low: 'Lowest rate',
  newest: 'Newest',
};

export const RATING_OPTIONS = [4.5, 4, 3] as const;
export const EXPERIENCE_OPTIONS = [1, 3, 5, 10] as const;

/** Sort is excluded — reordering is not narrowing. */
export function countActiveProviderFilters(f: ProviderFilters): number {
  let n = 0;
  if (f.services.length) n += 1;
  if (f.minRating != null) n += 1;
  if (f.maxRate != null) n += 1;
  if (f.minExperience != null) n += 1;
  if (f.location.trim()) n += 1;
  if (f.verifiedOnly) n += 1;
  if (f.availableOnly) n += 1;
  return n;
}

/** Stable cache key — object identity changes every render, this does not. */
export function serializeProviderFilters(f: ProviderFilters): string {
  return [
    f.services.slice().sort().join('|'),
    f.minRating ?? '',
    f.maxRate ?? '',
    f.minExperience ?? '',
    f.location.trim().toLowerCase(),
    f.verifiedOnly ? '1' : '',
    f.availableOnly ? '1' : '',
    f.sort,
  ].join(':');
}
