// Flutterwave webhook — credits a user's wallet after a successful top-up.
// Supabase Edge Function (Deno). Configure this URL in the Flutterwave dashboard.
//
// Secrets: FLW_SECRET_KEY, FLW_WEBHOOK_HASH, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Uses the service role to bypass RLS for the credit. Verifies the charge with
// Flutterwave's API before crediting, and is idempotent on tx_ref.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  // 1. Verify the webhook signature.
  const signature = req.headers.get('verif-hash');
  if (!signature || signature !== Deno.env.get('FLW_WEBHOOK_HASH')) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const event = await req.json();
    if (event?.event !== 'charge.completed' || event?.data?.status !== 'successful') {
      return new Response('ignored', { status: 200 });
    }

    const txId = event.data.id;
    const txRef: string = event.data.tx_ref ?? '';
    const userId = event.data.meta?.user_id ?? txRef.split('_')[1];
    const amount = Number(event.data.amount);
    if (!userId || !amount) return new Response('bad payload', { status: 400 });

    // 2. Re-verify with Flutterwave (never trust the webhook body alone).
    const verify = await fetch(
      `https://api.flutterwave.com/v3/transactions/${txId}/verify`,
      { headers: { Authorization: `Bearer ${Deno.env.get('FLW_SECRET_KEY')}` } },
    );
    const verified = await verify.json();
    if (verified?.data?.status !== 'successful') {
      return new Response('not verified', { status: 400 });
    }

    // 3. Idempotency: skip if we already recorded this reference.
    const { data: existing } = await admin
      .from('transactions')
      .select('id')
      .eq('reference', txRef)
      .maybeSingle();
    if (existing) return new Response('already processed', { status: 200 });

    // 4. Credit the wallet and log the transaction.
    const { data: wallet } = await admin
      .from('wallets')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();
    if (!wallet) return new Response('wallet not found', { status: 404 });

    await admin
      .from('wallets')
      .update({ balance: Number(wallet.balance) + amount })
      .eq('id', wallet.id);
    await admin.from('transactions').insert({
      wallet_id: wallet.id,
      type: 'fund',
      status: 'success',
      amount,
      reference: txRef,
    });

    return new Response('ok', { status: 200 });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : 'error', { status: 500 });
  }
});
