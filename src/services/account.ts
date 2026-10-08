import { formatMoney } from '@/components/ui/money-text';
import { supabase } from '@/services/supabase';

/** Why the server refused to delete the account, in words for the person. */
export class AccountDeletionBlocked extends Error {}

/**
 * Delete the signed-in person's account (migration 0022).
 *
 * The server refuses while money or work is in flight, closes open jobs and
 * quotes, scrubs the profile and deletes the login; the profile row stays as
 * "Deleted user" so the other side of every job keeps its history. The
 * avatar file is removed first, from here, because only its owner can delete
 * it from storage.
 */
export async function deleteMyAccount(userId: string): Promise<void> {
  // Best effort: a stray file must not stop the account being deleted.
  try {
    const { data: files } = await supabase.storage.from('job-media').list('avatars', { search: userId });
    const mine = (files ?? []).filter((f) => f.name.startsWith(userId)).map((f) => `avatars/${f.name}`);
    if (mine.length) await supabase.storage.from('job-media').remove(mine);
  } catch {
    // ignore
  }

  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    if (error.message.includes('WALLET_NOT_EMPTY')) {
      const amount = Number(error.details);
      throw new AccountDeletionBlocked(
        `You still have ${Number.isFinite(amount) ? formatMoney(amount) : 'money'} in your wallet. Withdraw it first, then delete your account.`,
      );
    }
    if (error.message.includes('ACTIVE_JOBS')) {
      const n = Number(error.details);
      throw new AccountDeletionBlocked(
        `${Number.isFinite(n) && n > 1 ? `${n} jobs are` : 'A job is'} still under way, disputed or holding money in escrow. Finish or settle ${n > 1 ? 'them' : 'it'} first.`,
      );
    }
    throw error;
  }

  // The login no longer exists on the server; only the local session needs clearing.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}
