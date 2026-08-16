import type { ProviderJobSegment, UserJobSegment } from '@/services/jobs';

/** Centralized TanStack Query keys. Keeps invalidation consistent across the app. */
export const queryKeys = {
  profile: (id: string) => ['profile', id] as const,
  /** `filterKey` comes from serializeProviderFilters — an object breaks caching. */
  providers: (search?: string, filterKey?: string) =>
    ['providers', search ?? '', filterKey ?? ''] as const,
  providersCount: (search?: string, filterKey?: string) =>
    ['providers-count', search ?? '', filterKey ?? ''] as const,

  jobs: {
    /**
     * Segment is part of the key because the status filter now runs in Postgres:
     * each segment is a separate paginated result, not a slice of one list.
     * Mutations should invalidate the `*All` prefixes, which match every segment.
     */
    mine: (segment: UserJobSegment) => ['jobs', 'mine', segment] as const,
    mineAll: () => ['jobs', 'mine'] as const,
    hired: (segment: ProviderJobSegment) => ['jobs', 'hired', segment] as const,
    hiredAll: () => ['jobs', 'hired'] as const,
    /** `filterKey` comes from serializeFilters — an object here would break caching. */
    discover: (search?: string, filterKey?: string) =>
      ['jobs', 'discover', search ?? '', filterKey ?? ''] as const,
    discoverCount: (search?: string, filterKey?: string) =>
      ['jobs', 'discover-count', search ?? '', filterKey ?? ''] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
  },

  providerMedia: (providerId: string) => ['provider-media', providerId] as const,

  quotes: {
    forJob: (jobId: string) => ['quotes', 'job', jobId] as const,
    mine: () => ['quotes', 'mine'] as const,
  },

  wallet: () => ['wallet'] as const,
  transactions: () => ['transactions'] as const,

  conversations: () => ['conversations'] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,

  reviews: (providerId: string) => ['reviews', providerId] as const,
  jobMedia: (jobId: string) => ['job-media', jobId] as const,
  notifications: () => ['notifications', 'list'] as const,
  /** Counted in Postgres — the list is paginated, so it can't be counted here. */
  unreadCount: () => ['notifications', 'unread-count'] as const,
} as const;
