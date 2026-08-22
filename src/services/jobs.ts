import { emptyJobFilters, postedSince, type JobFilters } from '@/lib/job-filters';
import type { Job, JobStatus, Profile } from '@/services/database.types';
import { pageRange, sanitizeSearchTerm, toPage, type Page } from '@/services/pagination';
import { supabase } from '@/services/supabase';

/**
 * A job plus who posted it.
 *
 * Providers were being asked to bid on jobs with no idea who they were for.
 * Joined client-side rather than with a PostgREST embed to match the rest of the
 * services here — `Database` declares `Relationships: []`, so embeds do not type.
 */
export type JobWithOwner = Job & { owner: Profile | null };

/** Attach owner profiles to a page of jobs in one round trip. */
async function withOwners(jobs: Job[]): Promise<JobWithOwner[]> {
  if (!jobs.length) return [];
  const ids = [...new Set(jobs.map((j) => j.owner_id))];
  const { data: owners } = await supabase.from('profiles').select('*').in('id', ids);
  return jobs.map((j) => ({ ...j, owner: owners?.find((p) => p.id === j.owner_id) ?? null }));
}

/** The segments the customer's My Jobs screen splits their jobs into. */
export type UserJobSegment = 'open' | 'active' | 'completed';
/** The segments the provider's My Jobs screen splits hired work into. */
export type ProviderJobSegment = 'active' | 'completed';

/**
 * Which statuses each segment covers.
 *
 * These live here, not in the screens, because the filter has to run in Postgres:
 * a list filtered after fetching cannot be paginated — page 1 might hold no rows
 * matching the segment while page 2 holds twenty.
 */
const USER_SEGMENT_STATUSES: Record<UserJobSegment, JobStatus[]> = {
  open: ['draft', 'posted', 'hiring'],
  active: ['in_progress'],
  completed: ['completed', 'disputed', 'cancelled'],
};

const PROVIDER_SEGMENT_STATUSES: Record<ProviderJobSegment, JobStatus[]> = {
  active: ['in_progress'],
  completed: ['completed', 'disputed'],
};

export type CreateJobInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  budget?: number | null;
  location?: string | null;
  scheduledFor?: string | null;
  /** Bid path posts publicly; drafts stay private until posted. */
  publish: boolean;
  /** Direct-hire path: invite a specific provider instead of posting publicly. */
  directProviderId?: string | null;
};

export async function listMyJobs(
  ownerId: string,
  segment: UserJobSegment,
  page: number,
): Promise<Page<Job>> {
  const { from, to } = pageRange(page);
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('owner_id', ownerId)
    .in('status', USER_SEGMENT_STATUSES[segment])
    .order('created_at', { ascending: false })
    // Unique tiebreaker so rows can't shuffle between pages. See listProviders.
    .order('id', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return toPage(data, page);
}

export async function getJob(id: string): Promise<JobWithOwner | null> {
  const { data, error } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: owner } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.owner_id)
    .maybeSingle();
  return { ...data, owner: owner ?? null };
}

export async function createJob(ownerId: string, input: CreateJobInput): Promise<Job> {
  const isDirect = !!input.directProviderId;
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      owner_id: ownerId,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      budget: input.budget ?? null,
      location: input.location ?? null,
      scheduled_for: input.scheduledFor ?? null,
      is_direct: isDirect,
      hired_provider_id: input.directProviderId ?? null,
      // Direct hires go straight to "hiring" (awaiting the invited provider's quote).
      status: isDirect ? 'hiring' : input.publish ? 'posted' : 'draft',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Jobs a provider can act on: publicly posted bids plus any direct-hire jobs
 * they've been invited to. RLS already enforces visibility.
 */
export async function listOpenJobs(
  providerId: string,
  search: string | undefined,
  page: number,
  filters: JobFilters = emptyJobFilters,
  mySkills: string[] = [],
): Promise<Page<JobWithOwner>> {
  const { from, to } = pageRange(page);
  let query = supabase
    .from('jobs')
    .select('*')
    .or(`status.eq.posted,and(hired_provider_id.eq.${providerId},status.eq.hiring)`);

  query = applyJobFilters(query, search, filters, mySkills);

  // Sort last so the tiebreaker stays adjacent to the primary key ordering.
  if (filters.sort === 'budget_high') {
    query = query.order('budget', { ascending: false, nullsFirst: false });
  } else if (filters.sort === 'budget_low') {
    query = query.order('budget', { ascending: true, nullsFirst: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }
  // Unique tiebreaker so rows can't shuffle between pages. See listProviders.
  query = query.order('id', { ascending: false }).range(from, to);

  const { data, error } = await query;
  if (error) throw error;
  // Enrich only this page's rows, so the extra round trip stays bounded.
  return toPage(await withOwners(data ?? []), page);
}

/** Count matching the same filters, for the "Show N jobs" button in the sheet. */
export async function countOpenJobs(
  providerId: string,
  search: string | undefined,
  filters: JobFilters,
  mySkills: string[] = [],
): Promise<number> {
  let query = supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .or(`status.eq.posted,and(hired_provider_id.eq.${providerId},status.eq.hiring)`);

  query = applyJobFilters(query, search, filters, mySkills);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Shared narrowing for the feed and its count, so the number on the button can
 * never disagree with the list it produces.
 *
 * Every clause here ANDs with the visibility `or()` applied by the callers —
 * including the search `or()`, which PostgREST combines with AND rather than
 * widening the result set.
 */
function applyJobFilters<T>(
  query: T,
  search: string | undefined,
  filters: JobFilters,
  mySkills: string[],
): T {
  // PostgREST builders are generic over the accumulated shape; narrowing each
  // chained call would mean threading a dozen type params through for no gain.
  let q = query as PostgrestFilterLike;

  const term = search ? sanitizeSearchTerm(search) : '';
  if (term) {
    q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`);
  }

  // "Matches my skills" intersects with an explicit category pick rather than
  // overriding it, so the two controls can't silently contradict each other.
  let categories = filters.categories;
  if (filters.matchesMySkills && mySkills.length) {
    categories = categories.length
      ? categories.filter((c) => mySkills.includes(c))
      : mySkills;
    // An empty intersection means nothing can match; `in.()` would be invalid.
    if (!categories.length) return q.eq('id', NO_MATCH_ID) as unknown as T;
  }
  if (categories.length) q = q.in('category', categories);

  // NOTE: budget bounds also exclude open-budget jobs, since NULL fails any
  // comparison. That is the behaviour a provider filtering on money expects.
  if (filters.minBudget != null) q = q.gte('budget', filters.minBudget);
  if (filters.maxBudget != null) q = q.lte('budget', filters.maxBudget);
  if (filters.budgetedOnly) q = q.not('budget', 'is', null);

  const loc = filters.location.trim() ? sanitizeSearchTerm(filters.location) : '';
  if (loc) q = q.ilike('location', `%${loc}%`);

  const since = postedSince(filters.postedWithinDays);
  if (since) q = q.gte('created_at', since);

  // Round-trips back to the caller's builder type: the chained calls all return
  // the same builder, but PostgrestFilterLike models only the subset used here.
  return q as unknown as T;
}

/** A uuid that cannot exist, used to force an empty result set. */
const NO_MATCH_ID = '00000000-0000-0000-0000-000000000000';

/** The chainable subset of the PostgREST builder that applyJobFilters uses. */
type PostgrestFilterLike = {
  or: (f: string) => PostgrestFilterLike;
  eq: (col: string, val: unknown) => PostgrestFilterLike;
  in: (col: string, vals: readonly unknown[]) => PostgrestFilterLike;
  gte: (col: string, val: unknown) => PostgrestFilterLike;
  lte: (col: string, val: unknown) => PostgrestFilterLike;
  ilike: (col: string, pattern: string) => PostgrestFilterLike;
  not: (col: string, op: string, val: unknown) => PostgrestFilterLike;
};

/** Jobs a provider has been hired for, split by segment. */
export async function listProviderJobs(
  providerId: string,
  segment: ProviderJobSegment,
  page: number,
): Promise<Page<Job>> {
  const { from, to } = pageRange(page);
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('hired_provider_id', providerId)
    .in('status', PROVIDER_SEGMENT_STATUSES[segment])
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return toPage(data, page);
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<void> {
  const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
  if (error) throw error;
}
