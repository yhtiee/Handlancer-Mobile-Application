// WhatsApp OTP via Twilio Verify — Supabase Edge Function (Deno).
//
// Disabled by default. Enable client-side with EXPO_PUBLIC_ENABLE_WHATSAPP_OTP=true.
// Required function secrets (set with `supabase secrets set ...`):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Flow:
//   { action: 'send',   phone }          → Twilio sends a WhatsApp code
//   { action: 'verify', phone, token }   → verify code, then mint a Supabase session
//
// NOTE: minting a session for a phone identity requires an admin user lookup/create
// (createUser / generateLink). The send path is wired; the session-minting step is
// marked TODO so we can ship email-first and turn this on later.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const VERIFY_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')!;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function twilioAuthHeader() {
  return 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
}

async function sendCode(phone: string) {
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${VERIFY_SID}/Verifications`,
    {
      method: 'POST',
      headers: {
        Authorization: twilioAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, Channel: 'whatsapp' }),
    },
  );
  if (!res.ok) throw new Error(`Twilio send failed: ${await res.text()}`);
}

async function checkCode(phone: string, token: string) {
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${VERIFY_SID}/VerificationCheck`,
    {
      method: 'POST',
      headers: {
        Authorization: twilioAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, Code: token }),
    },
  );
  const data = await res.json();
  return data.status === 'approved';
}

Deno.serve(async (req) => {
  try {
    const { action, phone, token } = await req.json();
    if (!phone) return json({ error: 'phone required' }, 400);

    if (action === 'send') {
      await sendCode(phone);
      return json({ ok: true });
    }

    if (action === 'verify') {
      const approved = await checkCode(phone, token);
      if (!approved) return json({ error: 'invalid code' }, 401);

      // TODO: look up or create the auth user for this phone, then return a session.
      // const { data: user } = await admin.auth.admin.createUser({ phone, phone_confirm: true });
      // ...issue a session / magic link and return it.
      void admin;
      return json({ ok: true, approved: true });
    }

    return json({ error: 'unknown action' }, 400);
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
