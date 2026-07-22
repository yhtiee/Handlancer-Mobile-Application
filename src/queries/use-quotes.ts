import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/keys';
import type { Quote } from '@/services/database.types';
import {
  approveQuote,
  getMyQuoteForJob,
  getQuote,
  listMyQuotes,
  listQuotesForJob,
  rejectQuote,
  submitQuote,
  type QuoteInput,
} from '@/services/quotes';

export function useJobQuotes(jobId: string) {
  return useQuery({
    queryKey: queryKeys.quotes.forJob(jobId),
    queryFn: () => listQuotesForJob(jobId),
    enabled: !!jobId,
  });
}

/** The provider's own quotes, paginated. */
export function useMyQuotes() {
  const { session } = useAuth();
  const providerId = session?.user.id;
  return useInfiniteQuery({
    queryKey: queryKeys.quotes.mine(),
    queryFn: ({ pageParam }) => listMyQuotes(providerId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!providerId,
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quote', id] as const,
    queryFn: () => getQuote(id),
    enabled: !!id,
  });
}

export function useMyQuoteForJob(jobId: string) {
  const { session } = useAuth();
  const providerId = session?.user.id;
  return useQuery({
    queryKey: ['quote', 'mine', jobId] as const,
    queryFn: () => getMyQuoteForJob(providerId!, jobId),
    enabled: !!providerId && !!jobId,
  });
}

export function useSubmitQuote(jobId: string) {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuoteInput) => submitQuote(session!.user.id, jobId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.mine() });
      qc.invalidateQueries({ queryKey: queryKeys.quotes.forJob(jobId) });
      qc.invalidateQueries({ queryKey: ['quote', 'mine', jobId] });
    },
  });
}

export function useApproveQuote(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quote: Quote) => approveQuote(quote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.forJob(jobId) });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      // Approving hires the provider and moves the job to in_progress, so it
      // leaves "Open" and enters "Active" for the customer, and appears in the
      // provider's hired list.
      qc.invalidateQueries({ queryKey: queryKeys.jobs.mineAll() });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.hiredAll() });
      qc.invalidateQueries({ queryKey: queryKeys.quotes.mine() });
    },
  });
}

export function useRejectQuote(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectQuote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.quotes.forJob(jobId) }),
  });
}
