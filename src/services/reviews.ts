import type { Profile, Review } from '@/services/database.types';
import { supabase } from '@/services/supabase';

export type ReviewWithReviewer = Review & { reviewer: Profile | null };

export async function createReview(input: {
  reviewerId: string;
  providerId: string;
  jobId: string;
  rating: number;
  comment?: string | null;
}): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      reviewer_id: input.reviewerId,
      provider_id: input.providerId,
      job_id: input.jobId,
      rating: input.rating,
      comment: input.comment ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getMyReviewForJob(
  jobId: string,
  reviewerId: string,
): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('job_id', jobId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listReviewsForProvider(
  providerId: string,
): Promise<ReviewWithReviewer[]> {
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!reviews?.length) return [];

  const ids = [...new Set(reviews.map((r) => r.reviewer_id))];
  const { data: reviewers } = await supabase.from('profiles').select('*').in('id', ids);
  return reviews.map((r) => ({
    ...r,
    reviewer: reviewers?.find((p) => p.id === r.reviewer_id) ?? null,
  }));
}
