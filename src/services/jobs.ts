import type { Job, JobStatus } from '@/services/database.types';
import { pageRange, sanitizeSearchTerm, toPage, type Page } from '@/services/pagination';
import { supabase } from '@/services/supabase';

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

export async function getJob(id: string): Promise<Job | null> {
  const { data, error } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
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
): Promise<Page<Job>> {
  const { from, to } = pageRange(page);
  let query = supabase
    .from('jobs')
    .select('*')
    .or(`status.eq.posted,and(hired_provider_id.eq.${providerId},status.eq.hiring)`)
    .order('created_at', { ascending: false })
    // Unique tiebreaker so rows can't shuffle between pages. See listProviders.
    .order('id', { ascending: false })
    .range(from, to);

  // A second `or()` is ANDed with the visibility one above, so this narrows the
  // open jobs rather than widening them.
  const term = search ? sanitizeSearchTerm(search) : '';
  if (term) {
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return toPage(data, page);
}

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
