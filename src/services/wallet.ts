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

/** Provider asks the owner to release the materials portion. Moves no money. */
export async function requestMaterialsRelease(jobId: string): Promise<void> {
  const { error } = await supabase.rpc('request_materials_release', { p_job_id: jobId });
  if (error) throw error;
}

/** Provider marks the work finished and asks the owner to review. Moves no money. */
export async function requestCompletionReview(jobId: string): Promise<void> {
  const { error } = await supabase.rpc('request_completion_review', { p_job_id: jobId });
  if (error) throw error;
}

/**
 * Owner rates the work and releases the final payment in one transaction — the
 * review and the payout succeed or fail together.
 */
export async function reviewAndRelease(
  jobId: string,
  rating: number,
  comment: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('review_and_release', {
    p_job_id: jobId,
    p_rating: rating,
    p_comment: comment,
  });
  if (error) throw error;
}

/**
 * Debits the wallet and queues a payout. The PIN is verified inside the same
 * function, so there is no ungated path to this — the old 1-arg overload was
 * dropped in migration 0012.
 */
export async function requestWithdrawal(amount: number, pin: string): Promise<void> {
  const { error } = await supabase.rpc('request_withdrawal', { p_amount: amount, p_pin: pin });
  if (error) {
    // Same reasoning as security.ts: keep Postgres' `hint`, which is usually
    // where the actionable part of a failure lives.
    console.log('[rpc error] request_withdrawal', JSON.stringify(error));
    throw new Error([error.message, error.hint].filter(Boolean).join(' — ') || 'Withdrawal failed.');
  }
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
