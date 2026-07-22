import type { Profile } from '@/services/database.types';
import { pageRange, sanitizeSearchTerm, toPage, type Page } from '@/services/pagination';
import { supabase } from '@/services/supabase';

/** Providers, best-rated first, filtered server-side by `search`. */
export async function listProviders(search: string | undefined, page: number): Promise<Page<Profile>> {
  const { from, to } = pageRange(page);
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('role', 'provider')
    .order('rating', { ascending: false })
    // Unique tiebreaker. Rating alone is not a total order, so Postgres is free
    // to return equal-rated rows in a different sequence per request — which
    // duplicates and skips rows across page boundaries.
    .order('id', { ascending: true })
    .range(from, to);

  const term = search ? sanitizeSearchTerm(search) : '';
  if (term) query = query.or(`name.ilike.%${term}%,location.ilike.%${term}%,bio.ilike.%${term}%`);

  const { data, error } = await query;
  if (error) throw error;
  return toPage(data, page);
}

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
  const arrayBuffer = await fetch(uri).then((res) => res.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from('job-media').upload(path, arrayBuffer, {
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

