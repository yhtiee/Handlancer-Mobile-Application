// Deliver a notification row as an Expo push message — Supabase Edge Function.
//
// Secrets: PUSH_HOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Called by the `on_notification_push` trigger via pg_net whenever a row lands in
// `notifications`. Until this existed the app collected push tokens and wrote
// notification rows but nothing ever contacted Expo, so no push could arrive.
//
// verify_jwt is off (Postgres has no user JWT); the shared PUSH_HOOK_SECRET
// header authenticates the caller instead.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function done(reason: string, status: number, extra?: unknown) {
  console.log(`[push] ${reason}`, extra === undefined ? '' : JSON.stringify(extra));
  return new Response(reason, { status });
}

type Payload = Record<string, unknown>;

/** Copy for each notification type. Mirrors notification-row.tsx. */
function describe(type: string, p: Payload): { title: string; body: string } {
  const title = String(p.title ?? 'your job');
  const money = (v: unknown) => `₦${Number(v ?? 0).toLocaleString()}`;

  switch (type) {
    case 'quote_received':
      return { title: 'New quote', body: `You received a quote on “${title}”` };
    case 'hired':
      return { title: 'You were hired 🎉', body: `${title} — payment is held in escrow` };
    case 'message':
      return { title: 'New message', body: String(p.preview ?? 'You have a new message') };
    case 'review':
      return { title: 'New review', body: `You received a ${p.rating}★ review` };
    case 'materials_requested':
      return {
        title: 'Materials funds requested',
        body: `Your provider requested ${money(p.amount)} on “${title}”`,
      };
    case 'completion_requested':
      return {
        title: 'Work marked complete',
        body: `Review “${title}” to release the final payment`,
      };
    case 'escrow_release':
      return { title: 'Materials released', body: `${money(p.amount)} is on its way` };
    case 'payout':
      return { title: 'Payment received', body: `${money(p.amount)} paid into your wallet` };
    // No allegation on the lock screen — see notify copy in 0020.
    case 'dispute_opened':
      return {
        title: 'A job was disputed',
        body: p.reference
          ? `“${title}” — ref ${p.reference}. Payment is on hold while support reviews it.`
          : `“${title}” — payment is on hold while support reviews it.`,
      };
    case 'dispute_resolved':
      return {
        title: 'Dispute resolved',
        body: `${money(p.released)} released · ${money(p.refunded)} refunded`,
      };
    default:
      return { title: 'HandLancer', body: 'You have a new notification' };
  }
}

Deno.serve(async (req) => {
  const secret = req.headers.get('x-push-secret');
  if (!secret || secret !== Deno.env.get('PUSH_HOOK_SECRET')) {
    return done('unauthorized', 401, { received: secret ? 'present' : 'missing' });
  }

  try {
    const body = await req.json();
    console.log('[push] payload', JSON.stringify(body));

    // pg_net posts { record: <new row> }; a manual call may post the row directly.
    const row = body?.record ?? body;
    const userId = row?.user_id;
    const type = String(row?.type ?? '');
    if (!userId || !type) return done('bad payload: missing user_id or type', 400);

    const { data: profile, error } = await admin
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .maybeSingle();
    if (error) return done('profile lookup failed', 500, error);

    const token = profile?.push_token;
    // Not an error: plenty of users never grant permission, or are on a build
    // where remote push is unavailable.
    if (!token) return done('no push token for user', 200, { userId });

    const payload: Payload =
      typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload ?? {});
    const { title, body: message } = describe(type, payload);

    const res = await fetch(EXPO_PUSH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify([
        {
          to: token,
          title,
          body: message,
          sound: 'default',
          channelId: 'default',
          // Consumed by the tap handler to deep-link to the right screen.
          data: { type, ...payload, notificationId: row.id },
        },
      ]),
    });
    const result = await res.json().catch(() => null);
    console.log('[push] expo response', res.status, JSON.stringify(result));

    // Expo answers 200 with per-message tickets; a DeviceNotRegistered ticket
    // means the token is dead and should stop being used.
    const ticket = result?.data?.[0];
    if (ticket?.status === 'error') {
      if (ticket?.details?.error === 'DeviceNotRegistered') {
        await admin.from('profiles').update({ push_token: null }).eq('id', userId);
        return done('token expired, cleared', 200, { userId });
      }
      return done('expo rejected the message', 502, ticket);
    }

    return done('ok: push sent', 200, { userId, type });
  } catch (e) {
    return done('error', 500, { message: e instanceof Error ? e.message : String(e) });
  }
});
