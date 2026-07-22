// Start a Flutterwave wallet top-up — Supabase Edge Function (Deno).
//
// Secrets (supabase secrets set ...):
//   FLW_SECRET_KEY, APP_REDIRECT_URL, SUPABASE_URL, SUPABASE_ANON_KEY
//
// Returns a hosted payment link. tx_ref encodes the user + amount so the
// webhook can credit the right wallet after payment succeeds.

import { createClient } from 'jsr:@supabase/supabase-js@2';

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

    const { amount } = await req.json();
    if (!amount || amount < 100) return json({ error: 'Invalid amount' }, 400);

    const txRef = `hl_${user.id}_${Date.now()}`;
    const res = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('FLW_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency: 'NGN',
        redirect_url: Deno.env.get('APP_REDIRECT_URL'),
        customer: { email: user.email ?? `${user.id}@handlancer.app` },
        meta: { user_id: user.id, amount },
        customizations: { title: 'HandLancer Wallet Top-up' },
      }),
    });

    const data = await res.json();
    if (data.status !== 'success') return json({ error: 'Could not start payment' }, 502);
    return json({ link: data.data.link });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
