import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { describeNotification } from '@/lib/notification-copy';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useNotificationsRealtime } from '@/queries/use-notifications';
import { useRealtimeSync } from '@/queries/use-realtime-sync';
import { savePushToken } from '@/services/notifications';
import type { Notification } from '@/services/database.types';
import {
  addPushResponseListener,
  configurePushHandler,
  getInitialPushData,
  presentLocalNotification,
  registerForPushNotifications,
} from '@/services/push';

/** Registers the device for push once signed in, and saves the token. */
export function PushRegistrar() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const shell = profile?.role === 'provider' ? 'provider' : 'user';

  /**
   * Whether Expo will deliver this notification to the tray on its own. Until
   * registration resolves we assume it will not, so the very first arrival on an
   * Expo Go build is not silently dropped.
   */
  const remotePush = useRef(false);

  /**
   * Raise the tray entry ourselves when Expo cannot.
   *
   * Without this, an Expo Go build writes the `notifications` row, updates the
   * in-app list, and shows nothing on the phone — the exact "notifications are
   * saved but never arrive" symptom. Skipped when remote push is live, or the
   * user would get every notification twice.
   */
  const announce = useCallback((n: Notification) => {
    if (remotePush.current) return;
    const payload = (n.payload ?? {}) as Record<string, unknown>;
    const { title, body } = describeNotification(n.type, payload);
    presentLocalNotification(title, body, {
      type: n.type,
      ...payload,
      notificationId: n.id,
    }).catch(() => {});
  }, []);

  // Single app-wide realtime subscription that feeds the notifications cache.
  useNotificationsRealtime(announce);
  // Keeps jobs, quotes, escrow and chat fresh without a manual reload.
  useRealtimeSync();

  useEffect(() => {
    if (!userId) return;
    let active = true;

    configurePushHandler();
    registerForPushNotifications()
      .then(({ token, reason }) => {
        if (!active) return;
        remotePush.current = Boolean(token);
        if (token && token !== profile?.push_token) {
          savePushToken(userId, token).catch(() => {});
        }
        if (reason) console.log(`[push] no token on this device: ${reason}`);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
    // Only re-run when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Tapping a notification should land on the thing it is about, not the home
  // screen — otherwise the user has to go and find it themselves.
  useEffect(() => {
    if (!userId) return;

    function open(data: Record<string, unknown>) {
      const jobId = typeof data.job_id === 'string' ? data.job_id : null;
      const conversationId =
        typeof data.conversation_id === 'string' ? data.conversation_id : null;

      if (conversationId) return router.push(routes.chatThread(shell, conversationId));
      if (jobId) {
        return router.push(
          shell === 'provider' ? routes.providerJobDetail(jobId) : routes.jobDetail(jobId),
        );
      }
      router.push(routes.profileNotifications(shell));
    }

    // A cold start from a tap never reaches the listener below.
    getInitialPushData()
      .then((data) => {
        if (data) open(data);
      })
      .catch(() => {});

    return addPushResponseListener(open);
  }, [userId, shell, router]);

  return null;
}
