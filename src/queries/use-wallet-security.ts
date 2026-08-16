import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth-provider';
import {
  getWalletSecurity,
  listBanks,
  saveBankAccount,
  setTransferPin,
} from '@/services/security';

const securityKey = ['wallet-security'] as const;

/** PIN + bank state for the current user. Booleans and a masked number only. */
export function useWalletSecurity() {
  const { session } = useAuth();
  return useQuery({
    queryKey: securityKey,
    queryFn: getWalletSecurity,
    enabled: !!session?.user.id,
  });
}

/** Nigerian bank list from Flutterwave. Rarely changes, so cache it hard. */
export function useBanks(enabled = true) {
  return useQuery({
    queryKey: ['banks', 'NG'] as const,
    queryFn: listBanks,
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useSetTransferPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pin, currentPin }: { pin: string; currentPin?: string }) =>
      setTransferPin(pin, currentPin),
    onSuccess: () => qc.invalidateQueries({ queryKey: securityKey }),
  });
}

export function useSaveBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountNumber, bankCode }: { accountNumber: string; bankCode: string }) =>
      saveBankAccount(accountNumber, bankCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: securityKey }),
  });
}
