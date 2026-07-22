import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/keys';
import { createReview, getMyReviewForJob, listReviewsForProvider } from '@/services/reviews';

export function useProviderReviews(providerId: string) {
  return useQuery({
    queryKey: queryKeys.reviews(providerId),
    queryFn: () => listReviewsForProvider(providerId),
    enabled: !!providerId,
  });
}

export function useMyReviewForJob(jobId: string) {
  const { session } = useAuth();
  const reviewerId = session?.user.id;
  return useQuery({
    queryKey: ['review', 'mine', jobId] as const,
    queryFn: () => getMyReviewForJob(jobId, reviewerId!),
    enabled: !!reviewerId && !!jobId,
  });
}

export function useCreateReview() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      providerId: string;
      jobId: string;
      rating: number;
      comment?: string | null;
    }) => createReview({ ...input, reviewerId: session!.user.id }),
    onSuccess: (review) => {
      qc.invalidateQueries({ queryKey: queryKeys.reviews(review.provider_id) });
      qc.invalidateQueries({ queryKey: queryKeys.profile(review.provider_id) });
      qc.invalidateQueries({ queryKey: ['review', 'mine', review.job_id] });
    },
  });
}
