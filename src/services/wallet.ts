import type { Escrow, Job, Profile, Transaction, Wallet } from '@/services/database.types';
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

export type TransactionDetail = Transaction & {
  job: Job | null;
  /** The other party on the job, when there is one. Never set for top-ups/payouts. */
  counterparty: Profile | null;
};

/**
 * One transaction with the context needed to recognise it.
 *
 * The list row can only ever say "Job payout · 3d ago"; a receipt has to answer
 * *which* job and *who*, which is the whole reason this screen exists. RLS keeps
 * it honest: `txn self` limits the row to the caller's own wallet, and any job
 * with a transaction is one they own or were hired for.
 */
export async function getTransaction(
  id: string,
  viewerId: string,
): Promise<TransactionDetail | null> {
  const { data: txn, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!txn) return null;

  if (!txn.job_id) return { ...txn, job: null, counterparty: null };

  const { data: job } = await supabase.from('jobs').select('*').eq('id', txn.job_id).maybeSingle();
  if (!job) return { ...txn, job: null, counterparty: null };

  const otherId = job.owner_id === viewerId ? job.hired_provider_id : job.owner_id;
  if (!otherId) return { ...txn, job, counterparty: null };

  const { data: other } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', otherId)
    .maybeSingle();
  return { ...txn, job, counterparty: other ?? null };
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

/**
 * Turn an RPC failure into something the user can act on.
 *
 * Postgres puts the actionable half in `hint` ("Wallet > Settings > Transfer
 * PIN"), which supabase-js leaves off `message`. Same reasoning as security.ts.
 */
function rpcError(error: { message?: string; hint?: string }, fallback: string): Error {
  console.log('[rpc error]', JSON.stringify(error));
  const parts = [error?.message, error?.hint].filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0,
  );
  return new Error(parts.join(' — ') || fallback);
}

/**
 * Release the materials portion. The PIN is verified inside the same function
 * that moves the money (migration 0018) — there is no client-side check to skip,
 * and the ungated single-argument version no longer exists.
 */
export async function releaseMaterials(jobId: string, pin: string): Promise<void> {
  const { error } = await supabase.rpc('release_materials', { p_job_id: jobId, p_pin: pin });
  if (error) throw rpcError(error, 'Could not release the materials funds.');
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
  pin: string,
): Promise<void> {
  const { error } = await supabase.rpc('review_and_release', {
    p_job_id: jobId,
    p_rating: rating,
    p_comment: comment,
    p_pin: pin,
  });
  if (error) throw rpcError(error, 'Could not release the payment.');
}

/**
 * Debits the wallet and queues a payout. The PIN is verified inside the same
 * function, so there is no ungated path to this — the old 1-arg overload was
 * dropped in migration 0012.
 */
export async function requestWithdrawal(amount: number, pin: string): Promise<void> {
  const { error } = await supabase.rpc('request_withdrawal', { p_amount: amount, p_pin: pin });
  if (error) throw rpcError(error, 'Withdrawal failed.');
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
