// Flutterwave webhook — credits a user's wallet after a successful top-up.
// Supabase Edge Function (Deno). Configure this URL in the Flutterwave dashboard.
//
// Secrets: FLW_SECRET_KEY, FLW_WEBHOOK_HASH, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Uses the service role to bypass RLS for the credit. Verifies the charge with
// Flutterwave's API before crediting, and is idempotent on tx_ref.
//
// Flutterwave has three payload shapes in the wild and the account decides which
// one it sends, so this normalises all of them:
//
//   v2 legacy: { "event.type": "CARD_TRANSACTION", id, txRef,  status: "successful", ... }
//   v3:        { "event":      "charge.completed", data: { id, tx_ref, status: "successful" } }
//   v4:        { "type":       "charge.completed", data: { id, tx_ref, status: "succeeded"  } }
//
// Three differences bite: the event key is renamed twice, v2 puts fields at the top
// level and camelCases `txRef`, and v4 spells the success status "succeeded" rather
// than "successful". Matching a single shape is what silently dropped real payments.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

/** Reference prefix minted by flutterwave-init: `hl_<userId>_<timestamp>`. */
const REF_PREFIX = 'hl_';

/** Log the reason, then return it — so the dashboard status and the log agree. */
function done(reason: string, status: number, extra?: unknown) {
  console.log(`[flw] ${reason}`, extra === undefined ? '' : JSON.stringify(extra));
  return new Response(reason, { status });
}

/** v3 says "successful", v4 says "succeeded". Both mean the money moved. */
const SUCCESS_STATUSES = new Set(['successful', 'succeeded']);

type Charge = {
  eventName: string;
  kind: 'charge' | 'transfer' | 'other';
  txId: string | number | null;
  txRef: string;
  status: string;
  amount: number;
  userId: string | null;
};

/**
 * Payouts must never credit a wallet, so transfers are identified before charges:
 * the legacy bank-transfer *charge* is called BANK_TRANSFER_TRANSACTION and would
 * otherwise be caught by a naive "contains transfer" test.
 */
function classify(eventName: string): Charge['kind'] {
  const name = eventName.toLowerCase();
  if (name === 'transfer.completed' || name === 'transfer') return 'transfer';
  if (name.startsWith('charge.completed')) return 'charge';
  // v2 names the payment channel rather than the event: CARD_TRANSACTION,
  // ACCOUNT_TRANSACTION, MOBILEMONEYNG_TRANSACTION, BANK_TRANSFER_TRANSACTION…
  if (name.endsWith('_transaction')) return 'charge';
  return 'other';
}

/** Flatten all three payload shapes into one form. */
function normalize(event: Record<string, any>): Charge | null {
  // v3/v4 nest everything under `data`; v2 puts it at the top level.
  const d = event?.data && typeof event.data === 'object' ? event.data : null;
  const src = d ?? event;
  if (!src || typeof src !== 'object') return null;

  const txRef = String(src.tx_ref ?? src.txRef ?? '');
  if (!txRef) return null;

  // v3 → `event`, v4 → `type`, v2 → `event.type`.
  const eventName = String(event?.event ?? event?.type ?? event?.['event.type'] ?? '');

  return {
    eventName,
    kind: classify(eventName),
    txId: src.id ?? null,
    txRef,
    status: String(src.status ?? '').toLowerCase(),
    amount: Number(src.amount ?? 0),
    userId: src.meta?.user_id ?? null,
  };
}

/**
 * Ask Flutterwave what really happened. Verifying by id is preferred, but the
 * legacy payload's id is not always usable against the v3 endpoint, so fall back
 * to the reference — which we minted ourselves and always have.
 */
async function verifyCharge(txId: string | number | null, txRef: string) {
  const key = Deno.env.get('FLW_SECRET_KEY');
  const headers = { Authorization: `Bearer ${key}` };

  if (txId !== null && txId !== undefined && `${txId}`.length > 0) {
    const byId = await fetch(
      `https://api.flutterwave.com/v3/transactions/${txId}/verify`,
      { headers },
    );
    const body = await byId.json().catch(() => null);
    if (byId.ok && body?.data?.status) return body;
  }

  const byRef = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    { headers },
  );
  return await byRef.json().catch(() => null);
}

Deno.serve(async (req) => {
  // 1. Verify the webhook signature.
  const signature = req.headers.get('verif-hash');
  console.log("Flutter signature", signature)
  console.log("supabse hash", Deno.env.get('FLW_WEBHOOK_HASH'))
  if (!signature || signature !== Deno.env.get('FLW_WEBHOOK_HASH')) {
    return done('unauthorized', 401, { received: signature ? 'present' : 'missing' });
  }

  try {
    const event = await req.json();
    console.log('[flw] payload', JSON.stringify(event));

    const charge = normalize(event);
    if (!charge) return done('ignored: no transaction reference in payload', 200);

    // Only our own top-ups. Anything else on the account is not ours to credit.
    if (!charge.txRef.startsWith(REF_PREFIX)) {
      return done('ignored: reference is not a HandLancer top-up', 200, {
        txRef: charge.txRef,
      });
    }
    // A payout leaving the account must never be credited as an incoming top-up.
    if (charge.kind === 'transfer') {
      return done('ignored: transfer payout, not a top-up', 200, {
        eventName: charge.eventName,
      });
    }
    if (charge.kind !== 'charge') {
      return done('ignored: not a charge event', 200, { eventName: charge.eventName });
    }
    if (!SUCCESS_STATUSES.has(charge.status)) {
      return done('ignored: charge not successful', 200, {
        status: charge.status,
        eventName: charge.eventName,
      });
    }

    // `hl_<userId>_<timestamp>` — userIds are UUIDs and contain no underscores.
    const userId = charge.userId ?? charge.txRef.split('_')[1];
    if (!userId) return done('bad payload: no user in reference', 400, { txRef: charge.txRef });

    // 2. Re-verify with Flutterwave (never trust the webhook body alone).
    const verified = await verifyCharge(charge.txId, charge.txRef);
    if (!SUCCESS_STATUSES.has(String(verified?.data?.status ?? '').toLowerCase())) {
      return done('not verified with Flutterwave', 400, {
        txRef: charge.txRef,
        verifiedStatus: verified?.data?.status ?? null,
        message: verified?.message ?? null,
      });
    }
    if (verified.data.tx_ref && verified.data.tx_ref !== charge.txRef) {
      return done('reference mismatch on verification', 400, {
        sent: charge.txRef,
        verified: verified.data.tx_ref,
      });
    }

    // Credit what Flutterwave confirms, not what the request body claimed.
    const amount = Number(verified.data.amount ?? charge.amount);
    if (!amount || amount <= 0) {
      return done('bad payload: no amount', 400, { amount });
    }

    // 3. Idempotency: skip if we already recorded this reference.
    const { data: existing } = await admin
      .from('transactions')
      .select('id')
      .eq('reference', charge.txRef)
      .maybeSingle();
    if (existing) return done('already processed', 200, { txRef: charge.txRef });

    // 4. Credit the wallet and log the transaction.
    const { data: wallet, error: walletError } = await admin
      .from('wallets')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();
    if (walletError) return done('wallet lookup failed', 500, walletError);
    if (!wallet) return done('wallet not found', 404, { userId });

    const newBalance = Number(wallet.balance) + amount;
    const { error: creditError } = await admin
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', wallet.id);
    if (creditError) return done('credit failed', 500, creditError);

    const { error: txError } = await admin.from('transactions').insert({
      wallet_id: wallet.id,
      type: 'fund',
      status: 'success',
      amount,
      reference: charge.txRef,
    });
    // The unique index on `reference` means a concurrent retry loses this race
    // rather than double-crediting; the balance above is already correct.
    if (txError) return done('transaction insert failed', 500, txError);

    return done('ok: wallet credited', 200, {
      userId,
      amount,
      txRef: charge.txRef,
      newBalance,
    });
  } catch (e) {
    return done('error', 500, { message: e instanceof Error ? e.message : String(e) });
  }
});
