import type { JobMedia, MediaKind, MediaPhase } from '@/services/database.types';
import { supabase } from '@/services/supabase';

const BUCKET = 'job-media';

export type MediaAsset = {
  uri: string;
  kind: MediaKind;
  mimeType?: string | null;
};

function extensionFor(asset: MediaAsset): string {
  const fromUri = asset.uri.split('.').pop()?.split('?')[0];
  if (fromUri && fromUri.length <= 5) return fromUri;
  return asset.kind === 'video' ? 'mp4' : 'jpg';
}

/** Upload a before/after asset to storage and record it in job_media. */
export async function uploadJobMedia(input: {
  providerId: string;
  jobId: string;
  phase: MediaPhase;
  asset: MediaAsset;
}): Promise<JobMedia> {
  const { providerId, jobId, phase, asset } = input;
  const ext = extensionFor(asset);
  const path = `${jobId}/${phase}-${Date.now()}.${ext}`;

  // RN-friendly upload: read the local file into an ArrayBuffer.
  const arrayBuffer = await fetch(asset.uri).then((res) => res.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: asset.mimeType ?? (asset.kind === 'video' ? 'video/mp4' : 'image/jpeg'),
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from('job_media')
    .insert({
      job_id: jobId,
      provider_id: providerId,
      phase,
      kind: asset.kind,
      url: pub.publicUrl,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listJobMedia(jobId: string): Promise<JobMedia[]> {
  const { data, error } = await supabase
    .from('job_media')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listProviderMedia(providerId: string): Promise<JobMedia[]> {
  const { data, error } = await supabase
    .from('job_media')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
