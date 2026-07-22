import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/keys';
import { listJobMedia, listProviderMedia, uploadJobMedia, type MediaAsset } from '@/services/media';
import type { MediaPhase } from '@/services/database.types';

export function useJobMedia(jobId: string) {
  return useQuery({
    queryKey: queryKeys.jobMedia(jobId),
    queryFn: () => listJobMedia(jobId),
    enabled: !!jobId,
  });
}

export function useProviderMedia(providerId: string) {
  return useQuery({
    queryKey: queryKeys.providerMedia(providerId),
    queryFn: () => listProviderMedia(providerId),
    enabled: !!providerId,
  });
}

export function useUploadMedia(jobId: string) {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phase, asset }: { phase: MediaPhase; asset: MediaAsset }) =>
      uploadJobMedia({ providerId: session!.user.id, jobId, phase, asset }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.jobMedia(jobId) });
      if (session) qc.invalidateQueries({ queryKey: queryKeys.providerMedia(session.user.id) });
    },
  });
}
