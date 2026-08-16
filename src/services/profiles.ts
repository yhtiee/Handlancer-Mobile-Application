import { readFileBytes } from '@/lib/file-bytes';
import { emptyProviderFilters, type ProviderFilters } from '@/lib/provider-filters';
import type { Profile } from '@/services/database.types';
import { pageRange, sanitizeSearchTerm, toPage, type Page } from '@/services/pagination';
import { supabase } from '@/services/supabase';

/** Providers, filtered and sorted server-side. */
export async function listProviders(
  search: string | undefined,
  page: number,
  filters: ProviderFilters = emptyProviderFilters,
): Promise<Page<Profile>> {
  const { from, to } = pageRange(page);
  let query = applyProviderFilters(
    supabase.from('profiles').select('*').eq('role', 'provider'),
    search,
    filters,
  );

  if (filters.sort === 'experience') {
    query = query.order('years_experience', { ascending: false, nullsFirst: false });
  } else if (filters.sort === 'rate_low') {
    query = query.order('hourly_rate', { ascending: true, nullsFirst: false });
  } else if (filters.sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query.order('rating', { ascending: false });
  }

  // Unique tiebreaker. Rating alone is not a total order, so Postgres is free
  // to return equal-rated rows in a different sequence per request — which
  // duplicates and skips rows across page boundaries.
  query = query.order('id', { ascending: true }).range(from, to);

  const { data, error } = await query;
  if (error) throw error;
  return toPage(data, page);
}

/** Count under the same filters, for the sheet's "Show N providers" button. */
export async function countProviders(
  search: string | undefined,
  filters: ProviderFilters,
): Promise<number> {
  const query = applyProviderFilters(
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'provider'),
    search,
    filters,
  );
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Shared so the count can never disagree with the list it describes. */
function applyProviderFilters<T>(
  query: T,
  search: string | undefined,
  filters: ProviderFilters,
): T {
  let q = query as ProviderFilterLike;

  const term = search ? sanitizeSearchTerm(search) : '';
  if (term) q = q.or(`name.ilike.%${term}%,location.ilike.%${term}%,bio.ilike.%${term}%`);

  // `services` is a text[]; `overlaps` matches providers offering ANY of the
  // picked trades, which is what a customer ticking three boxes means.
  if (filters.services.length) q = q.overlaps('services', filters.services);

  if (filters.minRating != null) q = q.gte('rating', filters.minRating);
  // NOTE: excludes providers who never set a rate, same as any NULL comparison.
  if (filters.maxRate != null) q = q.lte('hourly_rate', filters.maxRate);
  if (filters.minExperience != null) q = q.gte('years_experience', filters.minExperience);
  if (filters.verifiedOnly) q = q.eq('is_verified', true);
  if (filters.availableOnly) q = q.eq('availability', 'available');

  const loc = filters.location.trim() ? sanitizeSearchTerm(filters.location) : '';
  if (loc) q = q.ilike('location', `%${loc}%`);

  return q as unknown as T;
}

/** The chainable subset of the PostgREST builder used above. */
type ProviderFilterLike = {
  or: (f: string) => ProviderFilterLike;
  eq: (col: string, val: unknown) => ProviderFilterLike;
  gte: (col: string, val: unknown) => ProviderFilterLike;
  lte: (col: string, val: unknown) => ProviderFilterLike;
  ilike: (col: string, pattern: string) => ProviderFilterLike;
  overlaps: (col: string, vals: readonly unknown[]) => ProviderFilterLike;
};

export async function getProvider(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  id: string,
  patch: Partial<Profile>,
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}

export async function uploadAvatarImage(userId: string, uri: string, mimeType?: string): Promise<string> {
  const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const path = `avatars/${userId}-${Date.now()}.${ext}`;
  // Same empty-buffer trap as job media — see readFileBytes.
  const bytes = await readFileBytes(uri);

  const { error: uploadError } = await supabase.storage.from('job-media').upload(path, bytes, {
    contentType: mimeType ?? 'image/jpeg',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from('job-media').getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);
  if (dbError) throw dbError;

  return publicUrl;
}

