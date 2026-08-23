import { formatMoney } from '@/components/ui/money-text';
import type { IconName } from '@/components/ui/icon';

export type NotificationCopy = { icon: IconName; title: string; body: string };

/**
 * The single source of the wording for every notification type.
 *
 * Three places render the same events — the in-app list, the local notification
 * the app raises when remote push is unavailable, and the `send-push` Edge
 * Function — and they were drifting apart. The Edge Function runs on Deno and
 * cannot import this, so its copy is still separate (and says so); everything
 * inside the app comes from here.
 */
export function describeNotification(
  type: string,
  payload: Record<string, unknown> | null | undefined,
): NotificationCopy {
  const p = payload ?? {};
  const title = String(p.title ?? 'your job');
  const money = (v: unknown) => formatMoney(Number(v ?? 0));

  switch (type) {
    case 'quote_received':
      return { icon: 'document-text', title: 'New quote', body: `On “${title}”` };
    case 'hired':
      return {
        icon: 'checkmark-circle',
        title: 'You were hired',
        body: `${title} — payment is held in escrow`,
      };
    case 'message':
      return {
        icon: 'chatbubble',
        title: 'New message',
        body: String(p.preview ?? 'You have a new message'),
      };
    case 'review':
      return {
        icon: 'star',
        title: 'New review',
        body: `${String(p.rating ?? '')}★ on a completed job`,
      };
    case 'materials_requested':
      return {
        icon: 'cube',
        title: 'Materials funds requested',
        body: `${money(p.amount)} on “${title}”`,
      };
    case 'completion_requested':
      return {
        icon: 'checkmark-circle',
        title: 'Work marked complete',
        body: `Review “${title}” to release the final payment`,
      };
    case 'dispute_resolved':
      return {
        icon: 'shield-checkmark',
        title: 'Dispute resolved',
        body: `${money(p.released)} released · ${money(p.refunded)} refunded`,
      };
    case 'escrow_release':
      return { icon: 'cube', title: 'Materials released', body: money(p.amount) };
    case 'payout':
      return { icon: 'card', title: 'Payment received', body: money(p.amount) };
    default:
      return { icon: 'notifications', title: 'HandLancer', body: 'You have a new notification' };
  }
}
