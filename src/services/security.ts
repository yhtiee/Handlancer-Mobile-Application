import { supabase } from '@/services/supabase';

/**
 * Withdrawal security. Everything here is server-side by design.
 *
 * This module used to keep a 4-digit PIN as plaintext in device SecureStore and
 * compare it in JavaScript. `request_withdrawal` never saw it, so a direct
 * PostgREST call withdrew with no PIN at all — and reinstalling the app cleared
 * it. The PIN is now a bcrypt hash in `wallet_security`, a table with RLS and no
 * policies, verified inside the same function that debits the wallet.
 */

export type WalletSecurityStatus = {
  hasPin: boolean;
  /** Evaluated server-side — never compare `pinLockedUntil` against device time. */
  pinLocked: boolean;
  pinLockedUntil: string | null;
  hasBank: boolean;
  bankName: string | null;
  accountName: string | null;
  accountMasked: string | null;
};

export type Bank = { code: string; name: string };

/**
 * Turn a PostgREST/RPC failure into something a user can act on.
 *
 * `PostgrestError` extends Error, but its `message` is often terse and Postgres
 * puts the actionable part in `hint` (and the cause in `details`). Dropping those
 * is how "Could not save your PIN" ends up on screen with the real reason —
 * a missing function, a failed constraint — visible nowhere.
 */
function rpcError(error: unknown, fallback: string): Error {
  const e = error as { message?: string; details?: string; hint?: string; code?: string };
  // Full object to the console: the fields worth reading are rarely all in one.
  console.log('[rpc error]', JSON.stringify(e));

  const parts = [e?.message, e?.hint].filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0,
  );
  if (!parts.length) return new Error(fallback);
  return new Error(parts.join(' — '));
}

/**
 * Turn a functions.invoke failure into the message the function actually sent.
 *
 * supabase-js throws `FunctionsHttpError` whose `.message` is the useless
 * "Edge Function returned a non-2xx status code"; the real JSON body is left
 * unread on `.context`, which is a Response. Without this every backend error —
 * wrong account number, bad key, Flutterwave down — looks identical to the user.
 */
async function functionError(error: unknown, fallback: string): Promise<Error> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (body?.error) return new Error(String(body.error));
    } catch {
      // Body was not JSON — fall through to the generic message below.
    }
  }
  if (error instanceof Error && error.message && !/non-2xx/i.test(error.message)) {
    return error;
  }
  return new Error(fallback);
}

const EMPTY_STATUS: WalletSecurityStatus = {
  hasPin: false,
  pinLocked: false,
  pinLockedUntil: null,
  hasBank: false,
  bankName: null,
  accountName: null,
  accountMasked: null,
};

/** Booleans and a masked account number — never the hash or the full number. */
export async function getWalletSecurity(): Promise<WalletSecurityStatus> {
  const { data, error } = await supabase.rpc('wallet_security_status');
  if (error) throw rpcError(error, 'Could not load your wallet security settings.');
  // No row yet simply means nothing has been set up.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return EMPTY_STATUS;
  return {
    hasPin: Boolean(row.has_pin),
    pinLocked: Boolean(row.pin_locked),
    pinLockedUntil: row.pin_locked_until ?? null,
    hasBank: Boolean(row.has_bank),
    bankName: row.bank_name ?? null,
    accountName: row.account_name ?? null,
    accountMasked: row.account_masked ?? null,
  };
}

/** Set or change the PIN. `currentPin` is required once one exists. */
export async function setTransferPin(pin: string, currentPin?: string): Promise<void> {
  const { error } = await supabase.rpc('set_transfer_pin', {
    p_pin: pin,
    p_current_pin: currentPin ?? null,
  });
  if (error) throw rpcError(error, 'Could not save your PIN.');
}

export async function listBanks(): Promise<Bank[]> {
  const { data, error } = await supabase.functions.invoke<{ banks: Bank[] }>(
    'flutterwave-bank',
    { body: { action: 'banks' } },
  );
  if (error) throw await functionError(error, 'Could not load the bank list.');
  return data?.banks ?? [];
}

/** Preview the account holder's name without saving anything. */
export async function resolveBankAccount(
  accountNumber: string,
  bankCode: string,
): Promise<{ accountName: string; accountNumber: string }> {
  const { data, error } = await supabase.functions.invoke<{
    accountName: string;
    accountNumber: string;
  }>('flutterwave-bank', { body: { action: 'resolve', accountNumber, bankCode } });
  if (error) throw await functionError(error, 'Could not verify that account.');
  if (!data?.accountName) throw new Error('Could not verify that account.');
  return data;
}

/** Resolve again server-side and store the result. */
export async function saveBankAccount(
  accountNumber: string,
  bankCode: string,
): Promise<{ bankName: string; accountName: string; accountMasked: string }> {
  const { data, error } = await supabase.functions.invoke<{
    bankName: string;
    accountName: string;
    accountMasked: string;
  }>('flutterwave-bank', { body: { action: 'save', accountNumber, bankCode } });
  if (error) throw await functionError(error, 'Could not save that account.');
  if (!data?.accountName) throw new Error('Could not save that account.');
  return data;
}
