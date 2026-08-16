// Bank list + account resolution for withdrawals — Supabase Edge Function (Deno).
//
// Secrets: FLW_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Both actions need FLW_SECRET_KEY, which must never reach the app, so they live
// here rather than in the client. Resolution is also the only place allowed to
// write a bank account: `save_bank_account` is granted to service_role only, so
// the stored `account_name` is always the bank's answer rather than something the
// user typed.
//
// Actions (POST body):
//   { action: "banks" }
//   { action: "resolve", accountNumber: "0123456789", bankCode: "058" }
//   { action: "save",    accountNumber: "0123456789", bankCode: "058" }

import { createClient } from 'jsr:@supabase/supabase-js@2';

const FLW = 'https://api.flutterwave.com/v3';

/**
 * Every exit path logs a `[bank]` line. Without this a failure surfaces in the
 * app as supabase-js's generic "non-2xx status code" with nothing in the
 * dashboard to explain it.
 */
function json(body: unknown, status = 200) {
  if (status >= 400) console.log(`[bank] ${status}`, JSON.stringify(body));
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function flwHeaders() {
  return {
    Authorization: `Bearer ${Deno.env.get('FLW_SECRET_KEY')}`,
    'Content-Type': 'application/json',
  };
}

type ResolveResult =
  | { ok: true; accountName: string; accountNumber: string }
  | { ok: false; status: number; message: string };

/**
 * Ask Flutterwave who owns an account.
 *
 * Flutterwave's own `message` is carried back rather than swallowed — in test
 * mode `/accounts/resolve` only answers for their sandbox account numbers, and
 * "account does not exist" vs "invalid key" are very different problems for
 * whoever is debugging.
 */
async function resolveAccount(accountNumber: string, bankCode: string): Promise<ResolveResult> {
  const res = await fetch(`${FLW}/accounts/resolve`, {
    method: 'POST',
    headers: flwHeaders(),
    body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode }),
  });
  const body = await res.json().catch(() => null);
  console.log('[bank] resolve', res.status, JSON.stringify(body));

  if (body?.status === 'success' && body?.data?.account_name) {
    return {
      ok: true,
      accountName: String(body.data.account_name),
      accountNumber: String(body.data.account_number ?? accountNumber),
    };
  }
  return {
    ok: false,
    status: res.status === 401 || res.status === 403 ? 502 : 422,
    message: String(body?.message ?? 'Could not verify that account.'),
  };
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { action, accountNumber, bankCode } = await req.json();
    console.log('[bank] request', JSON.stringify({ action, bankCode, user: user.id }));

    if (!Deno.env.get('FLW_SECRET_KEY')) {
      return json({ error: 'Payments are not configured. Contact support.' }, 500);
    }

    // ── List banks ────────────────────────────────────────────────
    if (action === 'banks') {
      const res = await fetch(`${FLW}/banks/NG`, { headers: flwHeaders() });
      const body = await res.json().catch(() => null);
      if (body?.status !== 'success') {
        console.log('[bank] banks failed', res.status, JSON.stringify(body));
        return json({ error: String(body?.message ?? 'Could not load banks') }, 502);
      }
      const banks = (body.data ?? [])
        .map((b: { code: string; name: string }) => ({ code: b.code, name: b.name }))
        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
      return json({ banks });
    }

    if (!/^[0-9]{10}$/.test(String(accountNumber ?? ''))) {
      return json({ error: 'Account number must be 10 digits' }, 400);
    }
    if (!bankCode) return json({ error: 'Pick a bank' }, 400);

    // ── Resolve only: preview the name before committing ──────────
    if (action === 'resolve') {
      const resolved = await resolveAccount(accountNumber, bankCode);
      if (!resolved.ok) return json({ error: resolved.message }, resolved.status);
      return json({
        accountName: resolved.accountName,
        accountNumber: resolved.accountNumber,
      });
    }

    // ── Resolve and save ──────────────────────────────────────────
    if (action === 'save') {
      const resolved = await resolveAccount(accountNumber, bankCode);
      if (!resolved.ok) return json({ error: resolved.message }, resolved.status);

      // Bank name comes from the list rather than the client, so a spoofed body
      // cannot mislabel the stored account.
      const listRes = await fetch(`${FLW}/banks/NG`, { headers: flwHeaders() });
      const listBody = await listRes.json().catch(() => null);
      const bank = (listBody?.data ?? []).find(
        (b: { code: string }) => String(b.code) === String(bankCode),
      );
      if (!bank) return json({ error: 'Unknown bank' }, 400);

      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { error } = await admin.rpc('save_bank_account', {
        p_user_id: user.id,
        p_bank_code: String(bankCode),
        p_bank_name: String(bank.name),
        p_account_number: resolved.accountNumber,
        p_account_name: resolved.accountName,
      });
      if (error) {
        console.log('[bank] save_bank_account failed', JSON.stringify(error));
        return json({ error: error.message }, 500);
      }

      console.log('[bank] saved', JSON.stringify({ user: user.id, bank: bank.name }));
      return json({
        bankName: String(bank.name),
        accountName: resolved.accountName,
        accountMasked: `••••${resolved.accountNumber.slice(-4)}`,
      });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.log('[bank] unhandled', e instanceof Error ? e.stack : String(e));
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
