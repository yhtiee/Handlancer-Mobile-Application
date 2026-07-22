import type { Escrow, Transaction, Wallet } from '@/services/database.types';
import { pageRange, toPage, type Page } from '@/services/pagination';
import { supabase } from '@/services/supabase';

export async function getWallet(ownerId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listTransactions(ownerId: string, page: number): Promise<Page<Transaction>> {
  const wallet = await getWallet(ownerId);
  if (!wallet) return { items: [], nextPage: null };

  const { from, to } = pageRange(page);
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    // Unique tiebreaker so rows can't shuffle between pages.
    .order('id', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return toPage(data, page);
}

export async function getEscrow(jobId: string): Promise<Escrow | null> {
  const { data, error } = await supabase
    .from('escrows')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fundEscrow(jobId: string): Promise<void> {
  const { error } = await supabase.rpc('fund_escrow', { p_job_id: jobId });
  if (error) throw error;
}

export async function releaseMaterials(jobId: string): Promise<void> {
  const { error } = await supabase.rpc('release_materials', { p_job_id: jobId });
  if (error) throw error;
}

export async function releaseWorkmanship(jobId: string): Promise<void> {
  const { error } = await supabase.rpc('release_workmanship', { p_job_id: jobId });
  if (error) throw error;
}

export async function requestWithdrawal(amount: number): Promise<void> {
  const { error } = await supabase.rpc('request_withdrawal', { p_amount: amount });
  if (error) throw error;
}

/**
 * Start a Flutterwave wallet top-up. The Edge Function returns a hosted payment
 * link; the webhook credits the wallet once payment succeeds.
 */
export async function initTopUp(amount: number): Promise<{ link: string }> {
  const { data, error } = await supabase.functions.invoke<{ link: string }>(
    'flutterwave-init',
    { body: { amount } },
  );
  if (error) throw error;
  if (!data?.link) throw new Error('Could not start payment.');
  return data;
}
