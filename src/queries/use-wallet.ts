import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/keys';
import {
  fundEscrow,
  getEscrow,
  getWallet,
  initTopUp,
  listTransactions,
  releaseMaterials,
  releaseWorkmanship,
  requestWithdrawal,
} from '@/services/wallet';

export function useWallet() {
  const { session } = useAuth();
  const ownerId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.wallet(),
    queryFn: () => getWallet(ownerId!),
    enabled: !!ownerId,
  });
}

/** Wallet transactions, paginated. */
export function useTransactions() {
  const { session } = useAuth();
  const ownerId = session?.user.id;
  return useInfiniteQuery({
    queryKey: queryKeys.transactions(),
    queryFn: ({ pageParam }) => listTransactions(ownerId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!ownerId,
  });
}

export function useEscrow(jobId: string) {
  return useQuery({
    queryKey: ['escrow', jobId] as const,
    queryFn: () => getEscrow(jobId),
    enabled: !!jobId,
  });
}

/** Shared invalidation after any wallet/escrow movement. */
function useWalletInvalidation(jobId?: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.wallet() });
    qc.invalidateQueries({ queryKey: queryKeys.transactions() });
    if (jobId) {
      qc.invalidateQueries({ queryKey: ['escrow', jobId] });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      // Funding/releasing escrow moves the job's status, so it changes segment.
      qc.invalidateQueries({ queryKey: queryKeys.jobs.mineAll() });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.hiredAll() });
    }
  };
}

export function useFundEscrow(jobId: string) {
  const invalidate = useWalletInvalidation(jobId);
  return useMutation({ mutationFn: () => fundEscrow(jobId), onSuccess: invalidate });
}

export function useReleaseMaterials(jobId: string) {
  const invalidate = useWalletInvalidation(jobId);
  return useMutation({ mutationFn: () => releaseMaterials(jobId), onSuccess: invalidate });
}

export function useReleaseWorkmanship(jobId: string) {
  const invalidate = useWalletInvalidation(jobId);
  return useMutation({ mutationFn: () => releaseWorkmanship(jobId), onSuccess: invalidate });
}

export function useRequestWithdrawal() {
  const invalidate = useWalletInvalidation();
  return useMutation({
    mutationFn: (amount: number) => requestWithdrawal(amount),
    onSuccess: invalidate,
  });
}

export function useInitTopUp() {
  return useMutation({ mutationFn: (amount: number) => initTopUp(amount) });
}
